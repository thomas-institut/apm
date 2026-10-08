import {CtDataInterface} from "@/CtData/CtDataInterface";
import {CtData} from "@/CtData/CtData";

/**
 * A map that associates an edition witness token index to a CT index
 */
export type EditionWitnessIndexToCtIndexMap = Record<number, number>;

export function getEditionWitnessIndexToCtIndexMap(ctData: CtDataInterface, editionWitnessIndices: number[]): EditionWitnessIndexToCtIndexMap {
  const ctIndexMap: EditionWitnessIndexToCtIndexMap = {};
  editionWitnessIndices.forEach((index) => {
    ctIndexMap[index] = CtData.getCtIndexForEditionWitnessTokenIndex(ctData, index);
  });
  return ctIndexMap;
}