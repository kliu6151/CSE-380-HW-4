import Stack from "../../Wolfie2D/DataTypes/Collections/Stack";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import NavigationPath from "../../Wolfie2D/Pathfinding/NavigationPath";
import NavPathStrat from "../../Wolfie2D/Pathfinding/Strategies/NavigationStrategy";
import PositionGraph from "../../Wolfie2D/DataTypes/Graphs/PositionGraph";
import Queue from "../../Wolfie2D/DataTypes/Collections/Queue";
import Collection from "../../Wolfie2D/DataTypes/Interfaces/Collection";
import Navmesh from "../../Wolfie2D/Pathfinding/Navmesh";
import GraphUtils from "../../Wolfie2D/Utils/GraphUtils";

class PriorityQueue<T> {
  private readonly MAX_ELEMENTS: number;
  private q: Array<{ item: T; priority: number }>;
  private head: number;
  private tail: number;
  private size: number;

  constructor(maxElements: number = 10000) {
    this.MAX_ELEMENTS = maxElements;
    this.q = new Array(this.MAX_ELEMENTS);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  enqueue(item: T, priority: number): void {
    if ((this.tail + 1) % this.MAX_ELEMENTS === this.head) {
      throw new Error("Queue full - cannot add element");
    }

    this.size += 1;
    let i = this.tail;
    while (
      i !== this.head &&
      this.q[(i - 1 + this.MAX_ELEMENTS) % this.MAX_ELEMENTS].priority >
        priority
    ) {
      this.q[i] = this.q[(i - 1 + this.MAX_ELEMENTS) % this.MAX_ELEMENTS];
      i = (i - 1 + this.MAX_ELEMENTS) % this.MAX_ELEMENTS;
    }
    this.q[i] = { item, priority };
    this.tail = (this.tail + 1) % this.MAX_ELEMENTS;
  }

  dequeue(): T {
    if (this.head === this.tail) {
      throw new Error("Queue empty - cannot remove element");
    }

    this.size -= 1;
    let item = this.q[this.head].item;
    delete this.q[this.head];
    this.head = (this.head + 1) % this.MAX_ELEMENTS;

    return item;
  }

  peekNext(): T {
    if (this.head === this.tail) {
      throw "Queue empty - cannot get element";
    }

    let item = this.q[this.head].item;

    return item;
  }

  hasItems(): boolean {
    return this.head !== this.tail;
  }

  getSize(): number {
    return this.size;
  }

  clear(): void {
    this.forEach((item, index) => delete this.q[index]);
    this.size = 0;
    this.head = this.tail;
  }

  forEach(func: (item: T, index?: number) => void): void {
    let i = this.head;
    while (i !== this.tail) {
      func(this.q[i].item, i);
      i = (i + 1) % this.MAX_ELEMENTS;
    }
  }

  isEmpty(): boolean {
    return this.head === this.tail;
  }

  contains(func: (item: T) => boolean): boolean {
    let i = this.head;
    while (i !== this.tail) {
      if (this.q[i] && func(this.q[i].item)) {
        return true;
      }
      i = (i + 1) % this.MAX_ELEMENTS;
    }

    return false;
  }

  updatePriority(item: T, newPriority: number): void {
    let index = -1;

    for (let i = this.head; i !== this.tail; i = (i + 1) % this.MAX_ELEMENTS) {
      if (this.q[i].item === item) {
        index = i;
        break;
      }
    }

    if (index === -1) {
      throw new Error("Item not found in the queue.");
    }

    this.q[index].priority = newPriority;

    // Re-sort the queue
    for (
      let i = index;
      i !== this.head &&
      this.q[i].priority <
        this.q[(i - 1 + this.MAX_ELEMENTS) % this.MAX_ELEMENTS].priority;
      i = (i - 1 + this.MAX_ELEMENTS) % this.MAX_ELEMENTS
    ) {
      const temp = this.q[i];
      this.q[i] = this.q[(i - 1 + this.MAX_ELEMENTS) % this.MAX_ELEMENTS];
      this.q[(i - 1 + this.MAX_ELEMENTS) % this.MAX_ELEMENTS] = temp;
    }

    for (
      let i = index;
      (i + 1) % this.MAX_ELEMENTS !== this.tail &&
      this.q[i].priority > this.q[(i + 1) % this.MAX_ELEMENTS].priority;
      i = (i + 1) % this.MAX_ELEMENTS
    ) {
      const temp = this.q[i];
      this.q[i] = this.q[(i + 1) % this.MAX_ELEMENTS];
      this.q[(i + 1) % this.MAX_ELEMENTS] = temp;
    }
  }
}

export default class AstarStrategy extends NavPathStrat {
  /**
   * @see NavPathStrat.buildPath()
   */
  public buildPath(to: Vec2, from: Vec2): NavigationPath {
    const start = this.mesh.graph.snap(from);
    const end = this.mesh.graph.snap(to);

    // console.log("start", start)
    // console.log("end", end)
    // console.log("graph", this.mesh.graph)

    const openSet = new PriorityQueue<{ index: number; fCost: number }>();
    openSet.enqueue({ index: start, fCost: 0 }, 0);

    const cameFrom = new Map<number, number>();
    const gScore = new Map<number, number>();
    const fScore = new Map<number, number>();

    for (let i = 0; i < this.mesh.graph.numVertices; i++) {
      gScore.set(i, Infinity);
      fScore.set(i, Infinity);
    }

    gScore.set(start, 0);
    fScore.set(start, from.distanceTo(to));

    while (!openSet.isEmpty()) {
      const current = openSet.dequeue().index;

      if (current === end) {
        //   const path = this.reconstructPath(cameFrom, end, start, to);
        //   this.logAgentPath(path);
        return this.reconstructPath(cameFrom, end, start, to);
      }

      const neighbors = this.getNeighbors(this.mesh.graph, current);
      // console.log(neighbors)
      if (neighbors.length > 2) {
        for (const neighbor of neighbors) {
          const tentativeGScore =
            gScore.get(current) +
            this.getEdgeWeight(this.mesh.graph, current, neighbor);

          if (tentativeGScore < gScore.get(neighbor)) {
            cameFrom.set(neighbor, current);
            gScore.set(neighbor, tentativeGScore);
            fScore.set(
              neighbor,
              gScore.get(neighbor) +
                this.mesh.graph.positions[neighbor].distanceTo(to)
            );

            if (!openSet.contains((item) => item.index === neighbor)) {
              openSet.enqueue(
                { index: neighbor, fCost: fScore.get(neighbor) },
                fScore.get(neighbor)
              );
            } else {
              openSet.updatePriority(
                { index: neighbor, fCost: fScore.get(neighbor) },
                fScore.get(neighbor)
              );
            }
          }
        }
      }
    }

    throw new Error("A* pathfinding failed: No path found.");
  }

  //   public logAgentPath(path: NavigationPath): void {
  //     console.log(`Agent movement log:`);

  //     // Convert the path Stack into an array
  //     const pathArray = Array.from(path.path.toArray());

  //     for (let i = 0; i < pathArray.length - 1; i++) {
  //         const currentPosition = pathArray[i];
  //         const nextPosition = pathArray[i + 1];
  //         console.log(`Step ${i + 1}: Move from ${currentPosition.toString()} to ${nextPosition.toString()}`);
  //     }
  // }

  private reconstructPath(
    cameFrom: Map<number, number>,
    end: number,
    start: number,
    to: Vec2
  ): NavigationPath {
    const path = new Stack<Vec2>(this.mesh.graph.numVertices);

    // console.log("cameFrom", cameFrom)
    // console.log("end", end)
    // console.log("start", start)
    // console.log("to", to)
    // console.log("path", path)
    // console.log("this.mesh.graph.positions", this.mesh.graph.positions)

    path.push(to.clone());
    path.push(this.mesh.graph.positions[end]);

    let current = end;
    while (cameFrom.has(current)) {
      current = cameFrom.get(current);
      path.push(this.mesh.graph.positions[current]);
    }

    return new NavigationPath(path);
  }

  private getNeighbors(graph: PositionGraph, nodeIndex: number): number[] {
    const neighbors: number[] = [];

    let edge = graph.edges[nodeIndex];
    // console.log(edge);
    while (edge !== null) {
      // Check if the edge is not a wall
      //   if (edge.next !== null) {
      neighbors.push(edge.y);
      //   }

      edge = edge.next;
    }

    return neighbors;
  }

  private getEdgeWeight(
    graph: PositionGraph,
    x: number,
    y: number
  ): number | null {
    let edge = graph.edges[x];

    while (edge !== null) {
      if (edge.y === y) {
        const v1 = graph.positions[x];
        const v2 = graph.positions[y];
        const isDiagonal = Math.abs(v1.x - v2.x) === Math.abs(v1.y - v2.y);

        if (isDiagonal) {
          return edge.weight * 1.4;
        } else {
          return edge.weight;
        }
      }
      edge = edge.next;
    }

    return null;
  }
}
