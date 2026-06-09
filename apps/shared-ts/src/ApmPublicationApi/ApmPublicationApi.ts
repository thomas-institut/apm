import {ApiSuccessResponse} from "./ThomasInstStandardApiResponse.js";
import {CompactFmtText} from "@thomas-inst/fmt-text";

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\PublicationType
 */
export type PublicationType = 'transcription' | 'edition' | 'text';

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\PublicationListing
 */
export interface PublicationListing {
  type: PublicationType;
  id: number;
  /**
   * The publication's version time string. Example: 2023-01-01 00:00:00.123456
   */
  versionTimeString: string;
  title: string;
  description: string;
}

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\PublicationData (abstract)
 */
export interface PublicationData extends PublicationListing {}

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\TextPublicationData
 */
export interface TextPublicationData extends PublicationData {
  type: 'text';
  text: string;
}

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\TranscriptionColumn
 */
export interface TranscriptionColumn {
  transcriptionText: string;
}

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\TranscriptionPage
 */
export interface TranscriptionPage {
  foliation: string;
  pageNumber: number;
  imageUrl: string;
  thumbnailUrl: string;
  columns: TranscriptionColumn[];
}

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\TranscriptionData
 */
export interface TranscriptionData extends PublicationData {
  type: 'transcription';
  documentName: string;
  docType: string;
  languageCode: string;
  pages: TranscriptionPage[];
}

export function getTranscribedPages(transcriptionData: TranscriptionData) {
  const isTranscriptionEmpty = (page: TranscriptionPage) => {
    if (page.columns.length === 0) {
      return true;
    }
    return page.columns.every(col => col.transcriptionText.trim() === '');
  }
  return transcriptionData.pages.filter(page => !isTranscriptionEmpty(page));
}

/**
 * API can return any concrete PublicationData subtype.
 */
export type AnyPublicationData = PublicationData | TextPublicationData | TranscriptionData | EditionPublicationData;
/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\EditionPublication\MainTextTokenType
 */
export type MainTextTokenType =
  'text'
  | 'glue'
  | 'empty'
  | 'paragraph_end'
  | 'numbering_label'
  | 'foliation_change_marker';

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\EditionPublication\MainTextToken
 */
export interface MainTextToken {
  type: MainTextTokenType;
  text: CompactFmtText;
  style: string;
  lang?: string;
}

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\EditionPublication\ApparatusType
 */
export type ApparatusType = 'criticus' | 'fontium' | 'comparativus' | 'marginalia';

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\EditionPublication\SubEntryType
 */
export type SubEntryType = 'empty' | 'addition' | 'omission' | 'variant' | 'fullCustom' | 'auto' | 'autoFoliation';

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\EditionPublication\WitnessData
 */
export interface WitnessData {
  witnessIndex: number;
  hand: number;
  location: string;
  siglum: string;
  omitSiglum: boolean;
  forceHandDisplay: boolean;
}

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\EditionPublication\ApparatusSubEntry
 */
export interface ApparatusSubEntry {
  type: SubEntryType;
  text: CompactFmtText;
  witnessData: WitnessData[];
  keyword: string;
  position: number;
  source?: string;
}

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\EditionPublication\ApparatusEntry
 */
export interface ApparatusEntry {
  from: number;
  to: number;
  preLemma: CompactFmtText;
  postLemma: CompactFmtText;
  lemmaText: string;
  separator: CompactFmtText;
  subEntries: ApparatusSubEntry[];
}

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\EditionPublication\Apparatus
 */
export interface Apparatus {
  type: ApparatusType;
  entries: ApparatusEntry[];
}

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\EditionPublication\EditionWitnessInfo
 */
export interface EditionWitnessInfo {
  title: string;
  siglum: string;
  publicationId: number;
}

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\EditionPublication\SiglaGroup
 */
export interface SiglaGroup {
  siglum: string;
  witnessIndices: number[];
}

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\EditionPublication\EditionPublicationData
 */
export interface EditionPublicationData extends PublicationData {
  type: 'edition';
  languageCode: string;
  mainText: MainTextToken[];
  apparatuses: Apparatus[];
  witnesses: EditionWitnessInfo[];
  siglaGroups: SiglaGroup[];
}

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\PublicationApiListResponse
 */
export interface PublicationApiListResponse extends ApiSuccessResponse {
  publications: PublicationListing[];
}

/**
 * Mirrors \ThomasInstitut\ApmPublicationApi\PublicationApiGetResponse
 */
export interface PublicationApiGetResponse extends ApiSuccessResponse {
  publicationData: AnyPublicationData;
}


export function docTypeName(docType: string) {
  switch (docType) {
    case 'manuscript': return 'Manuscript';
    case 'print': return 'Print';
    default: return docType;
  }
}
