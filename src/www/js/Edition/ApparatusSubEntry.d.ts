import {FmtText} from "../FmtText/FmtText";

export class ApparatusSubEntry {
    plainText: string;
    constructor();
    type: string;
    enabled: boolean;
    source: string;
    fmtText: FmtText;
    witnessData: any[];
    keyword: string;
    position: number;
    tags: string[];
    hash!: string;

    hashString(): string;
}