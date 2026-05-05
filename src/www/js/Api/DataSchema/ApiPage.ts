

export interface PageUpdateDefinition {
  docId?: number;
  page?: number;
  type?: number;
  foliation?: string;
  overwriteFoliation?: boolean;
  cols?: number;
  lang?: number;
}

export interface UpdatePageSettingsBulkResponse {
  requestedPageIds: number[];
  updatedPageIds: number[];
  errors: string[];
}