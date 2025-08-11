

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
    /**
     * If true, the data is used when there's a foliation change from
     * a non-empty foliation to a another one. For example, from '20r' to '20v'.
     * When a foliation changes from '' to other value, there's no actual foliation,
     * it's simply the first time there's a foliation value for that witness.
     */
    realFoliationChange?: boolean;
}