import {MceDataInterface_v1, MceDataInterface_v2} from "@/MceData/MceDataInterface";
import {ApiResponse} from "@/Api/DataSchema/ApiResponse";


export interface ApiMceDataRaw {
  authorTid: number;
  chunks: string[];
  mceData: MceDataInterface_v1 | MceDataInterface_v2;
  validFrom: string;
  validUntil: string;
  versionDescription: string;
}


export interface ApiMceData {
  authorTid: number;
  chunks: string[];
  mceData: MceDataInterface_v2;
  validFrom: string;
  validUntil: string;
  versionDescription: string;
}



export interface ApiMceSaveResponse extends ApiResponse{
  result: 'Success';
  id: number;
  saveTimeStamp: string
}

export interface ApiMceSaveRequest {
  /**
   * Edition ID
   *
   * If it's -1, this is a new edition.
   */
  editionId: number;
  mceData: MceDataInterface_v2;
  description: string;
}
