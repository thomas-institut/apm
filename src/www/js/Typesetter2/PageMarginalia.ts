import {LineNumberData} from "./MainTextLineData";
import {TypesetterItem} from "./TypesetterItem";

export interface PageMarginalia {
    lineNumber: number;
    lineData: LineNumberData;
    marginalSubEntries: TypesetterItem[][];
}