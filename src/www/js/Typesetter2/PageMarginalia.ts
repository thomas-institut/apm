import {LineNumberData} from "./MainTextLineData";
import {TypesetterItem} from "./TypesetterItem.js";

export interface PageMarginalia {
    lineNumber: number;
    lineData: LineNumberData;
    marginalSubEntries: TypesetterItem[][];
}