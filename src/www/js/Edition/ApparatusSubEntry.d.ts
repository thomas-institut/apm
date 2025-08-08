

export class ApparatusSubEntry {
    plainText: string;
    constructor();
    type: string;
    enabled: boolean;
    source: string;
    fmtText: FmtTextToken[];
    witnessData: WitnessData[];
    keyword: string;
    position: number;
    tags: string[];
    hash!: string;

    static clone(subEntry: ApparatusSubEntry) : ApparatusSubEntry;
    hashString(): string;
}

export interface WitnessData {
    witnessIndex: number;
    hand: number;
    location: string;
    forceHandDisplay: boolean;
    siglum?: string;
    omitSiglum?: boolean;
}