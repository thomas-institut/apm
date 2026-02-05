
export type WitnessInfo  = GenericWitnessInfo | FullTxWitnessInfo;

interface WitnessInfoCommon {
  chunkNumber: number;
  errorCode: number;
  index: number;
  isValid: boolean;
  language: number;
  systemId: string;
}

export interface GenericWitnessInfo extends WitnessInfoCommon {
  type: 'generic'
  typeSpecificInfo: GenericWitnessSpecificInfo;
}

export type GenericWitnessSpecificInfo = { [key: string]: any }


export interface FullTxWitnessInfo extends WitnessInfoCommon {
  type: 'fullTx';
  typeSpecificInfo: FullTxSpecificInfo;
}
export interface FullTxSpecificInfo  {
  docId: number;
  localWitnessId: string;
  docInfo: DocInfo;
  timeStamp: string;
  lastVersion: VersionInfo;
  segments: SegmentInfo[];
}

export interface DocInfo {
  id: number;
  title: string;
  imageSource: number;
  imageSourceData: string;
  language: number;
  pageIds: number[];
  tid: number;
  type: number;
}

export interface VersionInfo {
  authorTid: number;
  column: number;
  description: string;
  id: number;
  isMinor: boolean;
  isPublished: boolean;
  isReview: boolean;
  timeFrom: string;
  timeUntil: string;
}

export interface SegmentInfo {
  from: SegmentBoundaryInfo;
  to: SegmentBoundaryInfo;
}

export interface SegmentBoundaryInfo {
  chunkNumber: number;
  columnNumber: number;
  docId: number;
  elementSequence: number;
  itemSequence: number;
  pageId: number;
  pageSequence: number;
  type: 'start' | 'end';
  validFrom: string;
  validUntil: string;
  witnessLocalId: string;
  workId: string;
}