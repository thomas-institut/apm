// noinspection ES6PreferShortImport

import {SiglaGroupInterface} from "./CtDataInterface.js";
import {ValidationError} from "../lib/Error/SystemError.js";
import {deepCopy} from "../toolbox/Util.js";

interface SiglaGroupData {
  witnesses: unknown[];
  sigla: string[];
  siglaGroups: SiglaGroupInterface[];
}

export class SiglaGroupUtil {

  static getSiglaGroupString(siglaGroup: SiglaGroupInterface, sigla: string[]): string {
    const witnessSigla = siglaGroup.witnesses.map((witnessIndex) => sigla[witnessIndex] ?? '').join('');
    return `${siglaGroup.siglum.trim()} => ${witnessSigla}`;
  }

  static deleteSiglaGroup<T extends SiglaGroupData>(data: T, siglaGroupIndex: number): T {
    if (siglaGroupIndex < 0 || siglaGroupIndex >= data.siglaGroups.length) {
      throw new ValidationError(`Invalid sigla group index ${siglaGroupIndex}`);
    }
    data.siglaGroups.splice(siglaGroupIndex, 1);
    return data;
  }

  static isSiglaGroupValid<T extends SiglaGroupData>(data: T, siglaGroupIndex: number, group: SiglaGroupInterface): true | string {
    const trimmedSiglum = group.siglum.trim();

    if (siglaGroupIndex >= data.siglaGroups.length) {
      return 'Invalid sigla group index';
    }

    if (trimmedSiglum === '') {
      return 'Sigla group must have a non-empty siglum';
    }

    if (group.witnesses.length < 2) {
      return 'Sigla group must have at least two witnesses';
    }

    if (group.witnesses.some(index => index >= data.witnesses.length || index < 0)) {
      return 'Sigla group contains invalid witnesses';
    }

    const otherGroups = data.siglaGroups.filter((_group, index) => index !== siglaGroupIndex);

    if (otherGroups.some(existingGroup => existingGroup.siglum.trim() === trimmedSiglum)) {
      return 'Sigla group siglum is duplicated';
    }

    if (data.sigla.some(siglum => siglum.trim() === trimmedSiglum)) {
      return 'Sigla group siglum is a witness siglum';
    }

    if (otherGroups.some(existingGroup => existingGroup.witnesses.every(index => group.witnesses.includes(index)))) {
      return 'Sigla group is duplicated';
    }

    return true;
  }

  static updateSiglaGroup<T extends SiglaGroupData>(
    data: T,
    siglaGroupIndex: number,
    group: SiglaGroupInterface,
    validator: (data: T, siglaGroupIndex: number, group: SiglaGroupInterface) => true | string = this.isSiglaGroupValid
  ): T {
    if (siglaGroupIndex < 0 || siglaGroupIndex >= data.siglaGroups.length) {
      throw new ValidationError(`Invalid sigla group index ${siglaGroupIndex}`);
    }
    const isValid = validator(data, siglaGroupIndex, group);
    if (isValid !== true) {
      throw new ValidationError(`Invalid sigla group ${JSON.stringify(group)}: ${isValid}`);
    }

    data.siglaGroups[siglaGroupIndex] = deepCopy(group);
    return data;
  }

  static addSiglaGroup<T extends SiglaGroupData>(
    data: T,
    group: SiglaGroupInterface,
    validator: (data: T, siglaGroupIndex: number, group: SiglaGroupInterface) => true | string = this.isSiglaGroupValid
  ): T {
    const isValid = validator(data, -1, group);
    if (isValid !== true) {
      throw new ValidationError(`Invalid sigla group ${JSON.stringify(group)}: ${isValid}`);
    }
    data.siglaGroups.push(deepCopy(group));
    return data;
  }
}