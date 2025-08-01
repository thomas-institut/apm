import {TypesetterObject} from "@/Typesetter2/TypesetterObject";
import {TypesetterItem} from "@/Typesetter2/TypesetterItem";

export const INFINITE_PENALTY: number;
export const BAD_POINT_FOR_A_BREAK: number;
export const REALLY_BAD_POINT_FOR_A_BREAK: number;

export const MINUS_INFINITE_PENALTY: number;

export const GOOD_POINT_FOR_A_BREAK:number;
export const REALLY_GOOD_POINT_FOR_A_BREAK:number;


export class Penalty extends TypesetterItem {
    penalty: number;
    flagged: boolean;
    itemToInsert: any|null;

    isFlagged(): boolean;
    setFlag(flagged: boolean): this;
    hasItemToInsert(): boolean;
    getItemToInsert(): any|null;
    setItemToInsert(itemToInsert: any|null): this;
    getPenalty(): number;
    setPenalty(penalty: number): this;
}