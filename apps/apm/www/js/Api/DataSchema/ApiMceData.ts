import {MceDataInterface, MceDataInterfaceAny} from "@/MceData/MceDataInterface";
import {ApiResponse} from "@/Api/DataSchema/ApiResponse";


export interface ApiMceGetResponse extends ApiResponse {
  result: 'Success';
  authorId: number;
  chunks: string[];
  mceData: MceDataInterfaceAny;
  validFrom: string;
  validUntil: string;
  versionDescription: string;
}


export interface ApiMceData {
  authorId: number;
  chunks: string[];
  mceData: MceDataInterface;
  validFrom: string;
  validUntil: string;
  versionDescription: string;
}

export interface ApiMceSaveResponse extends ApiResponse {
  result: 'Success';
  id: number;
  saveTimeStamp: string;
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
