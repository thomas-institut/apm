import {StandardizedStringData, StandardizedStringInstance} from "@/MceData/MceDataInterface";
import {Edition} from "@/Edition/Edition";

export interface StandardizedWord extends StandardizedStringData {
  original: string;
  standardized: string;
  numInstances: number;
  accepted: number,
  rejected: number,
  notReviewed: number,
  instances: StandardizedStringInstance[],
}


export class StandardizedWords {

  static build(arrayInMce: StandardizedStringData[], edition: Edition): StandardizedWord[] {
    return arrayInMce.map( (d):  StandardizedWord => {
      const matchingIndices = edition.mainText.map( (token, index) => {
        if (token.type !== 'text'){
          return -1;
        }
        return token.getPlainText() === d.original ? index : -1;
      }).filter( (index) => index !== -1);

      const instances =  matchingIndices.map( (index): StandardizedStringInstance => {
        const existing = d.instances.find( (instance) => instance.mainTextIndex === index);
        if (existing === undefined) {
          return {
            mainTextIndex: index,
            status: 'notReviewed',
          }
        }
        return existing;
      });

      return {
        original: d.original,
        standardized: d.standardized,
        numInstances: matchingIndices.length,
        notReviewed: instances.filter( (instance) => instance.status === 'notReviewed').length,
        accepted: instances.filter( (instance) => instance.status === 'accepted').length,
        rejected: instances.filter( (instance) => instance.status === 'rejected').length,
        instances: instances,
      }
    })
  }

}