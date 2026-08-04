// noinspection ES6PreferShortImport

import {MainTextTokenInterface} from "../Edition/EditionInterface.js";
import {getPlainText} from "@thomas-inst/fmt-text";

export interface StandardizedString {
  original: string,
  standardized: string,
  instances: StandardizedStringInstance[];
}

export type StandardizedStringInstanceStatus = 'rejected' | 'accepted' | 'notReviewed';

export interface StandardizedStringInstance {
  mainTextIndex: number;
  status: StandardizedStringInstanceStatus;
}

export function getMatchingMainTextTokenIndices(standardizedString: StandardizedString, mainTextTokenArray: MainTextTokenInterface[], lang: string): number[] {
  return mainTextTokenArray.map((token, index) => {
    if (token.type !== 'text') {
      return -1;
    }
    const matches = wordMatchesStandardizedString(getPlainText(token.fmtText), standardizedString, lang) ||
      (token.originalText !== undefined && wordMatchesStandardizedString(token.originalText, standardizedString, lang));
    return matches ? index : -1;
  }).filter((index) => index !== -1);
}


export function wordMatchesStandardizedString(word: string, standardizedString: StandardizedString, lang: string): boolean {
  if (lang !== 'la') {
    return word === standardizedString.original;
  }

  const originalLowerCase = standardizedString.original.toLowerCase();
  return word === originalLowerCase ||
    word === capitalizeFirstLetter(originalLowerCase) ||
    word === originalLowerCase.toUpperCase();
}

export function getWordStandardizedByString(word: string, standardizedString: StandardizedString, lang: string): string {
  if (lang !== 'la') {
    if (word === standardizedString.original) {
      return standardizedString.standardized;
    }
    return word;
  }

  const originalLowerCase = standardizedString.original.toLowerCase();

  if (word === originalLowerCase.toUpperCase()) {
    return standardizedString.standardized.toUpperCase();
  }

  if (word === capitalizeFirstLetter(originalLowerCase)) {
    return capitalizeFirstLetter(standardizedString.standardized);
  }

  if (word === originalLowerCase) {
    return standardizedString.standardized;
  }

  return word;
}

function capitalizeFirstLetter(str: string): string {
  if (str === '') {
    return str;
  }
  return str[0].toUpperCase() + str.slice(1);
}