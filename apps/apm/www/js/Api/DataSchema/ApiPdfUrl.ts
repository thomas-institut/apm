import {ApiResponse} from "@/Api/DataSchema/ApiResponse";
import {BasicTypesetterOptions, ItemList} from "@thomas-inst/typesetter";
import {ApparatusInterface} from "@/Edition/EditionInterface";
import {EditionTypesettingHelperOptions} from "@/Edition/EditionTypesettingHelper";

export interface ApiTypesetPdfResponse extends ApiResponse{
  result: 'Success';
  url: string;
  cached: boolean;
  typesetterProcessingTime: number;
}

export interface ApiTypesetPdfRequestData {
  options: BasicTypesetterOptions<ApparatusInterface>,
  helperOptions: EditionTypesettingHelperOptions,
  /**
   * The export object of the main text ItemList to typeset
   */
  mainTextList: Record<string, any>,
  extraData: { apparatuses: ApparatusInterface[] }
}

export interface ApiClientPdfUrlResponse {
  url: string | null;
  errorMsg?: string;
}