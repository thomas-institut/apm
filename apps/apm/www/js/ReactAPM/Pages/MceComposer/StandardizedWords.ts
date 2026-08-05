import {Edition} from "@/Edition/Edition";
import {
  getMatchingMainTextTokenIndices, getStaleInstanceIndices,
  StandardizedString,
  StandardizedStringInstance
} from "@/MceData/StandardizedString";

export interface StandardizedWord extends StandardizedString {
  original: string;
  standardized: string;
  numInstances: number;
  accepted: number,
  rejected: number,
  notReviewed: number,
  instances: StandardizedStringInstance[],
  staleInstanceIndices: number[],
}


export class StandardizedWords {

  static build(arrayInMce: StandardizedString[], edition: Edition): StandardizedWord[] {
    return arrayInMce.map((d): StandardizedWord => {
      const instances = getMatchingMainTextTokenIndices(d, edition.mainText, edition.lang).map((index): StandardizedStringInstance => {
        const existing = d.instances.find((instance) => instance.mainTextIndex === index);
        if (existing === undefined) {
          return {
            mainTextIndex: index,
            status: 'notReviewed',
          };
        }
        return existing;
      });

      return {
        original: d.original,
        standardized: d.standardized,
        numInstances: instances.length,
        notReviewed: instances.filter((instance) => instance.status === 'notReviewed').length,
        accepted: instances.filter((instance) => instance.status === 'accepted').length,
        rejected: instances.filter((instance) => instance.status === 'rejected').length,
        instances: instances,
        staleInstanceIndices: getStaleInstanceIndices(d, edition.mainText, edition.lang),
      };
    });
  }

}