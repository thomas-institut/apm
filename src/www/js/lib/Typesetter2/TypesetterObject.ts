/*
 *  Copyright (C) 2022 Universität zu Köln
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



export class TypesetterObject {

  /**
   * Data associated with the object.
   */
  metadata: any = {};

  /**
   *
   * @return {{[key:string]: any}}
   */
  getExportObject(): { [key: string]: any; } {
    let obj: { [key: string] : any} = {  class: 'TypesetterObject'}
    if (Object.keys(this.metadata).length !== 0) {
      obj.metadata = this.metadata
    }
    return obj
  }

  /**
   * Sets the object's values from an object
   * if mergeValues is true, current values not given in the input object
   * are preserved, otherwise default values will be used
   * @param {{[key:string]: any}}object
   * @param {boolean}mergeValues
   */
  setFromObject(object: any, mergeValues: boolean ): this {
    if (!mergeValues) {
      this.metadata = {}
    }
    if (object['metadata'] !== undefined && typeof object['metadata'] === 'object' && !Array.isArray(object['metadata'])) {
      Object.keys(object['metadata']).forEach( (key) => {
        this.addMetadata(key, object['metadata'][key])
      })
    }
    return this
  }

  addMetadata(key: string, someThing: any) {
    this.metadata[key] = someThing
    return this
  }

  getMetadata(key: string): any {
    return this.metadata[key]
  }

  deleteMetadata(key: string): void {
    delete this.metadata[key]
  }

  hasMetadata(key: string): boolean {
    return this.metadata.hasOwnProperty(key)
  }

  /**
   * Utility function to copy scalar values from an object
   * @param{{[key:string]: any}}template
   * @param {{[key:string]: any}}inputObject
   * @param {boolean} mergeValues
   * @protected
   */
  protected copyValues(template: { [key: string]: any; }, inputObject: { [key: string]: any; }, mergeValues: boolean) {
    Object.keys(template).forEach( (key) => {
      // @ts-ignore
      let defaultValue = mergeValues ? this[key] : template[key]
      // @ts-ignore
      this[key] = inputObject[key] !== undefined ? inputObject[key] : defaultValue
    })
  }


}