

import {TypesetterItem} from "@/Typesetter2/TypesetterItem";
import {HORIZONTAL} from "@/Typesetter2/TypesetterItemDirection";


export class ItemList extends TypesetterItem {
    constructor (direction: number = HORIZONTAL);

    getList(): TypesetterItem[];
    setList(list: TypesetterItem[]): this;
    getItemCount(): number;
    pushItem(item: TypesetterItem): this;
    pushItemArray(itemArray: TypesetterItem[]): this;
    popItem(): TypesetterItem;
    trimEndGlue(): void;
    getText(): string;

}