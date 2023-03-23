import NPCActor from "../../../Actors/NPCActor";
import NPCBehavior from "../NPCBehavior";
import FalseStatus from "../NPCStatuses/FalseStatus";
import { TargetExists } from "../NPCStatuses/TargetExists";
import { HasItem } from "../NPCStatuses/HasItem";
import PickupItem from "../NPCActions/PickupItem";
import UseHealthpack from "../NPCActions/UseHealthpack";
import Healthpack from "../../../GameSystems/ItemSystem/Items/Healthpack";
import Item from "../../../GameSystems/ItemSystem/Item";
import Battler from "../../../GameSystems/BattleSystem/Battler";
import GameEvent from "../../../../Wolfie2D/Events/GameEvent";
import GoapAction from "../../../../Wolfie2D/AI/Goap/GoapAction";
import GoapState from "../../../../Wolfie2D/AI/Goap/GoapState";
import Idle from "../NPCActions/GotoAction";
import BasicFinder from "../../../GameSystems/Searching/BasicFinder";
import { ClosestPositioned } from "../../../GameSystems/Searching/HW4Reducers";
import {
  BattlerActiveFilter,
  ItemFilter,
  VisibleItemFilter,
  BattlerGroupFilter,
  BattlerHealthFilter,
} from "../../../GameSystems/Searching/HW4Filters";

/**
 * When an NPC is acting as a healer, their goal is to try and heal it's teammates by running around, picking up healthpacks,
 * bringing to the healthpacks to their allies and healing them.
 */
export default class HealerBehavior extends NPCBehavior {
  /** Initialize the NPC AI */
  public initializeAI(owner: NPCActor, options: Record<string, any>): void {
    super.initializeAI(owner, options);

    // Initialize healer statuses
    this.initializeStatuses();
    // Initialize healer actions
    this.initializeActions();
    // Set the healers goal
    this.goal = HealerStatuses.GOAL;

    // Initialize the healer behavior
    this.initialize();
  }

  public handleEvent(event: GameEvent): void {
    switch (event.type) {
      default: {
        super.handleEvent(event);
        break;
      }
    }
  }

  public update(deltaT: number): void {
    super.update(deltaT);
  }

  protected initializeStatuses(): void {
    let scene = this.owner.getScene();

    // Add a status to check if a healthpack exists in the scene and it's visible
    this.addStatus(
      HealerStatuses.HPACK_EXISTS,
      new TargetExists(
        scene.getHealthpacks(),
        new BasicFinder<Item>(null, ItemFilter(Healthpack), VisibleItemFilter())
      )
    );

    // Add a status to check if the healer has a healthpack in their inventory
    this.addStatus(
      HealerStatuses.HAS_HPACK,
      new HasItem(
        this.owner,
        new BasicFinder<Item>(null, ItemFilter(Healthpack))
      )
    );

    // Add a status to check if a low-health ally exists in the scene
    let lowhealthAlly = new BasicFinder<Battler>(null, BattlerActiveFilter(), BattlerGroupFilter([this.owner.battleGroup]));
    this.addStatus(HealerStatuses.ALLY_EXISTS, new TargetExists(scene.getBattlers(), lowhealthAlly));


    // Add the goal status
    this.addStatus(HealerStatuses.GOAL, new FalseStatus());
  }

  protected initializeActions(): void {
    let scene = this.owner.getScene();

    // Pick up healthpack action
    let pickupHealthpack = new PickupItem(this, this.owner);
    pickupHealthpack.targets = scene.getHealthpacks();
    pickupHealthpack.targetFinder = new BasicFinder<Item>(
      ClosestPositioned(this.owner),
      ItemFilter(Healthpack),
        VisibleItemFilter()
    );
    pickupHealthpack.addPrecondition(HealerStatuses.HPACK_EXISTS);
    pickupHealthpack.addEffect(HealerStatuses.HAS_HPACK);
    pickupHealthpack.cost = 5;
    this.addState(HealerActions.PICKUP_HPACK, pickupHealthpack);
    
    // Use healthpack action
    let useHealthpack = new UseHealthpack(this, this.owner);
    useHealthpack.targets = scene.getBattlers();
    useHealthpack.targetFinder = new BasicFinder<Battler>(
      ClosestPositioned(this.owner),
      BattlerActiveFilter(),
      BattlerGroupFilter([this.owner.battleGroup]),
      BattlerHealthFilter(0, 4)
    );
    useHealthpack.addPrecondition(HealerStatuses.HAS_HPACK);
    useHealthpack.addPrecondition(HealerStatuses.ALLY_EXISTS);
    useHealthpack.addEffect(HealerStatuses.GOAL);
    useHealthpack.cost = 1;
    this.addState(HealerActions.HEAL_ALLY, useHealthpack);

    // Idle action for healer
    let idle = new Idle(this, this.owner);
    idle.targets = [this.owner];
    idle.targetFinder = new BasicFinder();
    idle.addEffect(HealerStatuses.GOAL);
    idle.cost = 1000;
    this.addState(HealerActions.IDLE, idle);
  }

  public override addState(stateName: HealerAction, state: GoapAction): void {
    super.addState(stateName, state);
  }

  public override addStatus(statusName: HealerStatus, status: GoapState): void {
    super.addStatus(statusName, status);
  }
}
export type HealerStatus = typeof HealerStatuses[keyof typeof HealerStatuses];
export const HealerStatuses = {
  HPACK_EXISTS: "healthpack-exists",

  HAS_HPACK: "has-healthpack",

  ALLY_EXISTS: "low-health-ally-exists",

  GOAL: "goal",
} as const;

export type HealerAction = typeof HealerActions[keyof typeof HealerActions];
export const HealerActions = {
  PICKUP_HPACK: "pickup-healthpack",

  HEAL_ALLY: "heal-ally",

  IDLE: "idle",
} as const;
