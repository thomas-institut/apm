import {CtDataInterface} from "../CtData/CtDataInterface";


export interface SingleChunkApiData {
    authorTid: number;
    ctData: CtDataInterface;
    ctInfo: CtInfo[];
    docInfo: DocInfoInSingleChunkApiData[];
    isLatestVersion: boolean;
    timeStamp: string;
    versionId: number;
    versions: any[];
}


export interface CtInfo {
    archived: boolean;
    timeFrom: string;
    timeUntil: string;
    title: string;
    type: string;
}

export interface DocInfoInSingleChunkApiData {
    docId: number;
    title: string;
}