// noinspection ES6PreferShortImport

import {Apparatus} from "../Edition/Apparatus.js";

export interface CtDataInterface {
    lang: string;
    witnesses: WitnessInterface[];
    editionWitnessIndex: number;
    witnessTitles: string[];
    witnessOrder: number[];
    sigla: string[];
    siglaGroups: SiglaGroupInterface[];
    chunkId: string;
    tableId: number;
    customApparatuses: Apparatus[];
    schemaVersion: string;
    type: string;
    title: string;
    collationMatrix: number[][];
    groupedColumns: number[];
    automaticNormalizationsApplied: string[];
    excludeFromAutoCriticalApparatus: number[];
    includeInAutoMarginalFoliation: number[];
    archived: boolean;
}

export interface SiglaGroupInterface {
    siglum: string;
    witnesses: number[];
}

export interface NonTokenItemIndex {
    pre: number[];
    post: number[];
}


export interface WitnessInterface {
    chunkId: string;
    lang: string;
    witnessType: string;
    timestamp: string;
    ApmWitnessId: string;
    tokens: WitnessTokenInterface[];

    // used by FullTx witnesses
    workId?: string;
    chunk?: number;
    localWitnessId?: string;
    docId?: number;
    items?: FullTxItemInterface[];
    nonTokenItemIndexes?: NonTokenItemIndex[];
}


export interface WitnessTokenInterface {
    tokenType: string;
    text: string;
    tokenClass: string;
    normalizedText?: string;
    normalizationSource?: string;
    fmtText: any[];

    // used by Edition Witnesses
    markType?: string;
    style?: string;
    formats?: any[];

    // used by FullTx Witnesses
    textBox?: number;
    line?: number | RangeInterface;
    sourceItems?: SourceItemInterface[];
}

export interface SourceItemInterface {
    index: number;
    charRange: RangeInterface;
}
export interface RangeInterface {
    from: number;
    to: number;
}

export interface FullTxItemInterface {
   type: string;
   text: string;
   address: FullTxItemAddressInterface;
   markType?: string;

}

export interface FullTxItemAddressInterface {
    itemIndex: number;
    textBoxIndex: number;
    pageId: number;
    ceId: number;
    column: number;
    foliation: string;
    itemSeq: number;
    itemId: number;
    ceSeq: number;
}