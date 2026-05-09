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


/**
 * A helper class to keep a tally of strings
 */

export class StringCounter {
  private theCounters: IndividualStringCounter[];

  constructor () {
    this.theCounters = []
  }

  reset() {
    this.theCounters = []
  }

  addString(someString: string) {
    let index = this.getStringIndex(someString)
    if (index === -1) {
      // new string
      this.theCounters.push(new IndividualStringCounter(someString) )
    } else {
      this.theCounters[index].inc()
    }
  }

  getCount(someString: string) {
    let index = this.getStringIndex(someString)
    if (index === -1) {
      return 0
    }
    return this.theCounters[index].getCount()
  }

  private getStringIndex(someString: string): number {
    return this.theCounters.map( (counter) => { return counter.str}).indexOf(someString)
  }

}


class IndividualStringCounter {
  public str: string;
  private count: number;

  constructor (str: string, count=1) {
    this.str = str
    this.count = count
  }

  inc() {
    this.count++
  }

  getCount():number {
    return this.count
  }
}