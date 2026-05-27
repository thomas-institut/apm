import {ApiSuccessResponse} from "@/Api/Schema/ApiResponse";

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
export type AnyPublicationData = PublicationData | TextPublicationData | TranscriptionData;

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


export function pubTypeName(code: string) {
  switch (code) {
    case 'text': return 'Text';
    case 'transcription': return 'Transcription';
    default: return code;
  }
}

export function docTypeName(docType: string) {
  switch (docType) {
    case 'manuscript': return 'Manuscript';
    case 'print': return 'Print';
    default: return docType;
  }
}
