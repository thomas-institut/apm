import {KeyStore} from "../../toolbox/KeyStore.mjs";

export class ApparatusEntry {
    section?: number[];
    from: number;
    to: number;
    preLemma: string;
    lemma: string;
    postLemma: string;
    lemmaText: string;
    separator: string;
    tags: string[];
    subEntries: ApparatusSubEntry[];
    metadata: KeyStore;
    /**
     * Only used for a trick in CtData.ts, which needs to be fixed
     * @deprecated
     *
     **/
    toDelete?: boolean;

    allSubEntriesAreOmissions(): boolean;

    static orderSubEntries(theEntry: ApparatusEntry) : ApparatusEntry;
    static clone(entry: ApparatusEntry) : ApparatusEntry ;
    static allSubEntriesInEntryObjectAreOmissions(entry: ApparatusEntry): boolean;
}