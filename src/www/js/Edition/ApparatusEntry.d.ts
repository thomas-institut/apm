export class ApparatusEntry {

    constructor();
    section: number[];
    from: number;
    to: number;
    preLemma: string;
    lemma: string;
    postLemma: string;
    lemmaText: string;
    separator: string;
    tags: string[];
    subEntries: ApparatusSubEntry[];
    metadata: any;
}