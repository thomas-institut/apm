import {FmtTextToken} from "@/FmtText/FmtTextToken";

export class ApparatusEntry {

    constructor();
    section?: number[];
    from: number;
    to: number;
    preLemma: string;
    lemma: string | FmtTextToken[];
    postLemma: string;
    lemmaText: string;
    separator: string;
    tags: string[];
    subEntries: ApparatusSubEntry[];
    metadata: any;
    /**
     * Only used for a trick in CtData.ts, which needs to be fixed
     * @deprecated
     *
     **/
    toDelete?: boolean;


    static orderSubEntries(theEntry: ApparatusEntry) : ApparatusEntry;
    static clone(entry: ApparatusEntry) : ApparatusEntry ;
}