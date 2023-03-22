import StateMachineGoapAI from "../../../Wolfie2D/AI/Goap/StateMachineGoapAI";
import Vec2 from "../../../Wolfie2D/DataTypes/Vec2";
import GameEvent from "../../../Wolfie2D/Events/GameEvent";
import GameNode from "../../../Wolfie2D/Nodes/GameNode";
import Line from "../../../Wolfie2D/Nodes/Graphics/Line";
import Timer from "../../../Wolfie2D/Timing/Timer";
import NPCActor from "../../Actors/NPCActor";
import { ItemEvent } from "../../Events";
import NPCAction from "./NPCActions/NPCAction";
import Inventory from "../../GameSystems/ItemSystem/Inventory";
import Item from "../../GameSystems/ItemSystem/Item";
import UseHealthpack from "./NPCActions/UseHealthpack";
import Healthpack from "../../GameSystems/ItemSystem/Items/Healthpack";

/**
 * An abstract implementation of behavior for an NPC. Each concrete implementation of the
 * NPCBehavior class should define some new behavior for an NPCActor. 
 */
export default abstract class NPCBehavior extends StateMachineGoapAI<NPCAction>  {

    protected override owner: NPCActor;

    public initializeAI(owner: NPCActor, options: Record<string, any>): void {
        this.owner = owner;
        this.receiver.subscribe(ItemEvent.LASERGUN_FIRED);
        this.receiver.subscribe(ItemEvent.CONSUMABLE_USED);
    }

    public activate(options: Record<string, any>): void {}

    public update(deltaT: number): void {
        super.update(deltaT);
    }

    /**
     * @param event the game event
     */
    public handleEvent(event: GameEvent): void {
        switch(event.type) {
            case ItemEvent.LASERGUN_FIRED: {
                console.log("Catching and handling lasergun fired event!!!");
                this.handleLasergunFired(event.data.get("actorId"), event.data.get("to"), event.data.get("from"));
                break;
            }
            case ItemEvent.CONSUMABLE_USED: {
                console.log("Catching and handling consumable used event!!!");
                console.log(event.data)
                this.handleConsumableUsed(event.data.get("node"), event.data.get("item"));
                break;
            }
            default: {
                super.handleEvent(event);
                break;
            }
        }
    }

    protected handleLasergunFired(actorId: number, to: Vec2, from: Vec2): void {
        if (actorId !== this.owner.id) {
            this.owner.health -= this.owner.collisionShape.getBoundingRect().intersectSegment(to, from) ? 1 : 0;
        }
    }
    protected handleConsumableUsed(actor: NPCActor, consumable: Healthpack): void {
        if (actor === this.owner) {
            this.owner.health += consumable.health;
        }
    }
    

    // protected handleItemRequest(node: GameNode, inventory: Inventory): void {
    //     let items: Item[] = new Array<Item>(...this.healthpacks, ...this.laserguns).filter((item: Item) => {
    //         return item.inventory === null && item.position.distanceTo(node.position) <= 10;
    //     });

    //     if (items.length > 0) {
    //         inventory.add(items.reduce(ClosestPositioned(node)));
    //     }
    // }
    
}