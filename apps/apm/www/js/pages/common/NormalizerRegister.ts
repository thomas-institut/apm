/*
 *  Copyright (C) 2021 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */


import {TokenNormalizer} from "../../Normalizer/TokenNormalizer";

interface RegisteredNormalizer {
  name: string,
  normalizerObject: TokenNormalizer,
  metadata: any
}

export class NormalizerRegister {
  private readonly normalizerArray: RegisteredNormalizer[] = [];

  registerNormalizer(name: string, normalizerObject: TokenNormalizer, metadata: any = {}) {
    if (this.normalizerIsDefined(name)) {
      console.error(`Normalizer '${name}' already defined trying to register normalizer`)
    } else {
      this.normalizerArray.push({
        name: name,
        normalizerObject: normalizerObject,
        metadata: metadata
      })
    }
  }

  getRegisteredNormalizers(): string[] {
    return this.normalizerArray.map( (n) => { return n.name})
  }

  applyNormalizer(name: string, str: string): string {
    if (this.normalizerIsDefined(name)) {
      return this.getNormalizerByName(name).normalizerObject.normalizeString(str)
    }
    return str;
  }

  applyNormalizerList(names: string[], str: string): string {
    let resultingString = str
    let thisObject = this
    names.forEach( (name) => {
      resultingString = thisObject.applyNormalizer(name, resultingString)
    })
    return resultingString
  }

  applyAllNormalizers(str: string): string {
    return this.applyNormalizerList( this.getRegisteredNormalizers(), str)
  }

  setNormalizerMetadata(name: string, data: any) {
    let index = this.getNormalizerIndex(name)
    if (index !== -1) {
      this.normalizerArray[index].metadata = data
    }
  }

  getNormalizerMetadata(name: string): any {
    return this.getNormalizerByName(name).metadata
  }

  normalizerIsDefined(name: string): boolean {
     return this.getNormalizerIndex(name) !== -1
  }

  getNormalizerByName(name: string): any {
    return this.normalizerArray[this.getNormalizerIndex(name)]
  }

  getNormalizerIndex(name: string): number {
    return this.normalizerArray.map( (n) => { return n.name}).indexOf(name)
  }

}