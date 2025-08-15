import {EditionWitnessInfoInterface} from "./EditionInterface.js";


export class EditionWitnessInfo implements EditionWitnessInfoInterface {

  siglum: string = '';
  title: string = '';

  setFromInterface(witnessInfo: EditionWitnessInfoInterface): this {
    this.siglum = witnessInfo.siglum;
    this.title = witnessInfo.title;
    return this;
  }

  setSiglum(siglum: string): this {
    this.siglum = siglum;
    return this;
  }

  setTitle(title: string): this {
    this.title = title;
    return this;
  }

}