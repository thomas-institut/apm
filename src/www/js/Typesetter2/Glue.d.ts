
import {TypesetterItem} from "@/Typesetter2/TypesetterItem";


export const INFINITE_STRETCH: number;
export class Glue extends  TypesetterItem{
    stretch: number;
    shrink: number;


    getStretch(): number;
    setStretch(stretch: number): this;
    getShrink(): number;
    setShrink(shrink: number): this;
}