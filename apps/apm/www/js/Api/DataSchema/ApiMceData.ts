import {MceDataInterface} from "@/MceData/MceDataInterface";


export interface ApiMceData {
  authorTid: number;
  chunks: string[];
  mceData: MceDataInterface;
  validFrom: string;
  validUntil: string;
  versionDescription: string;
}