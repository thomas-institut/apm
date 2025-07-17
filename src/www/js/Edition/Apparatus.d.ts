export class Apparatus {
    type: string;
    entries: ApparatusEntry[];

    sortEntries(): void;
    findEntryIndex(mainTextFrom: number, mainTextTo: number) : number;
}