import {SiglaGroupInterface} from "@/CtData/CtDataInterface";


export interface MceDataInterface {
    chunks: ChunkInMceData[],
    chunkOrder?: number[],
    title:  string,
    initialSpace: string,
    preamble: any[],
    witnesses: WitnessInMceData[],
    sigla: string[],
    siglaGroups: SiglaGroupInterface[],
    lang: string,
    stylesheetId: string,
    archived: boolean,
    schemaVersion: string,
    includeInAutoMarginalFoliation?: number[];
}

export interface WitnessInMceData {
    docId: number,
    title: string,
    localWitnessId: string,
    witnessId: string,
}

export interface ChunkInMceData {
    chunkId: string,
    break: string,
    chunkEditionTableId: number,
    lineNumbersRestart: boolean
    title: string,
    version: string,
    /**
     * A map between the MceData witness and the chunk witness
     *
     *  `witnessIndices[x]` : index of chunk's witness `x` in MceData's `witnesses` array
     */
    witnessIndices: number[]
}