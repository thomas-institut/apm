import {MceDataInterface} from "@/MceData/MceDataInterface";
import {ApiResponse} from "@/Api/DataSchema/ApiResponse";


export interface ApiMceData {
  authorTid: number;
  chunks: string[];
  mceData: MceDataInterface;
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
  mceData: MceDataInterface;
  description: string;
}
