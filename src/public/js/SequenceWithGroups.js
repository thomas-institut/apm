/*
 *  Copyright (C) 2020 Universität zu Köln
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
 * A sequence of numbers 0 to n where groups of contiguous numbers are defined
 * The groups within the sequence can be expressed both as a list of  (from,to) intervals or
 * as a list of numbers representing those elements of the sequence that are grouped with
 * the following number
 * e.g.  0,1,2,3,4,5
 * groups:  [  { from: 0, to: 0}, {from: 1, to:3}, {from: 4,to: 5} ]
 * groupedWithNextNumbers:  [1,2,4]
 *
 */
export class SequenceWithGroups {

  constructor (length, initialGroupedWithNextNumbers = []) {
    this.length = length
    this.groupedWithNextNumbers = []
    initialGroupedWithNextNumbers.forEach( (n) => {
      this.groupWithNext(n)
    })
  }

  getGroupedNumbers() {
    return this.groupedWithNextNumbers
  }

  /**
   * Removes a number from the sequence preserving group consistency
   * @param number
   */
  removeNumber(number) {
    let currentGroups = this.getGroups()

    // find groups that include the given number, there should be exactly one of them
    let numberGroups = currentGroups.filter( (g) => { return g.from<=number && g.to >=number })
    if (numberGroups.length !== 1) {
      console.error(`Inconsistent groups, found more than one group for number ${number}`)
    }
    let numberGroup = numberGroups[0]

    // initialize new groups with groups before the given number, these groups are passed intact to the new set
    let newGroups = currentGroups.filter( (g) => { return g.to < number })

    if (numberGroup.to !== numberGroup.from) {
      // if the group to which the given number belongs represents an interval longer than one,
      // replace that group with one adjusted to exclude the given number
      let newNumberGroup = { from: numberGroup.from, to: numberGroup.to - 1 }
      if (number === numberGroup.from) {
        newNumberGroup.from++
      }
      newGroups.push(newNumberGroup)
    }
    // adjust the groups that come after the given number and add them to the new groups
    let groupsAfter = currentGroups.filter( (g) => {return g.from > number }).map( (g) => { return {from: g.from-1, to: g.to - 1}})
    newGroups = newGroups.concat(groupsAfter)
    // update the sequence
    this.groupedWithNextNumbers = this.getGroupedNumbersFromGroupArray(newGroups)
    this.length--
  }

  /**
   * Grows the sequence by one with the new element in position zero
   * This amounts to shifting all the current groups by one. The new element
   * is not grouped with anything
   */
  insertNumberZero() {
    this.groupedWithNextNumbers = this.groupedWithNextNumbers.map( (n) => { return n+1})
    this.length++
  }

  /**
   * Grows the sequence by one, with new element in the position after the given number
   * Extends an existing group if the new element is in the middle of the group.
   * @param number
   */
  insertNumberAfter(number) {

    if (number < 0) {
      this.insertNumberZero()
      return
    }
    let currentGroups = this.getGroups()

    let groupsBefore = currentGroups.filter( (g) => { return g.from < number && g.to < number})
    let numberGroups = currentGroups.filter( (g) => { return g.from<=number && g.to >=number })
    let groupsAfter = currentGroups.filter( (g) => {return g.from > number && g.to > number})

    if (numberGroups.length !== 1) {
      console.error(`Inconsistent groups, found more than one group for number ${number}`)
      console.log(numberGroups)
    }
    let numberGroup = numberGroups[0]
    let newGroups = groupsBefore
    let newNumberGroup = { from: numberGroup.from, to: numberGroup.to}
    if (numberGroup.to !== numberGroup.from) {
      // only extend the number's group if the group represents an interval larger than 1
      newNumberGroup.to++
    }
    newGroups.push(newNumberGroup)
    groupsAfter = groupsAfter
      .map( (g) => { return {from: g.from+1, to: g.to + 1}})  // update group boundaries
      .filter( (g) => { return g.from !== newNumberGroup.from && g.to !== newNumberGroup.to}) // remove possible duplicate
    newGroups = newGroups.concat(groupsAfter)
    // update the sequence
    this.groupedWithNextNumbers = this.getGroupedNumbersFromGroupArray(newGroups)
    this.length++
  }

  isGroupedWithNext(number) {
    return this.groupedWithNextNumbers.indexOf(number) !== -1
  }

  isGroupedWithPrevious(number) {
    return this.groupedWithNextNumbers.indexOf(number-1) !== -1
  }

  groupWithNext(number) {
    if (number >= this.length-1) {
      console.error(`Out of bounds number, cannot group with next: ${number}`)
    }
    if (!this.isGroupedWithNext(number)) {
      this.groupedWithNextNumbers.push(number)
    }
  }

  ungroupWithNext(number) {
    if (number >= this.length-1 || !this.isGroupedWithNext(number)) {
      // nothing to do
      return
    }
    this.groupedWithNextNumbers = this.groupedWithNextNumbers.filter( (n) => { return n !== number})
  }

  groupInterval(from, to ) {
    for(let i = from; i < to; i++) {
      this.groupWithNext(i)
    }
  }

  ungroupInterval(from, to) {
    for(let i = from; i < to; i++) {
      this.ungroupWithNext(i)
    }
  }

  getGroupForNumber(number) {
    // naive implementation
    let minNumber = number
    let maxNumber = number

    while (this.isGroupedWithPrevious(minNumber)) {
      minNumber--
    }
    while (this.isGroupedWithNext(maxNumber)) {
      maxNumber++
    }
    return { from: minNumber, to: maxNumber}
  }

  /**
   * Returns an array with the groups defined in the sequence
   * every group  is an object of the form
   *    {
   *       from:  someNumber
   *       to: someNumber
   *    }
   *
   *    this defines a group as a set of numbers  G = { x | from <= x <= to}
   * @returns {[]}
   */
  getGroups() {
    // semi-brute force!
    let i = 0

    let groups = []
    let newGroup = true
    let currentGroup = {}
    while(i < this.length) {
      if (newGroup) {
        currentGroup = { from: i, to: i}
        newGroup = false
      }
      if (!this.isGroupedWithNext(i)) {
        currentGroup.to = i
        groups.push(currentGroup)
        newGroup = true
      }
      i++
    }
    return groups
  }


  getGroupedNumbersFromGroupArray(groupArray) {
    let groupedNumbers = []
    groupArray.forEach( (group) => {
      for (let i = group.from; i < group.to; i++) {
        groupedNumbers.push(i)
      }
    })
    return groupedNumbers
  }

}