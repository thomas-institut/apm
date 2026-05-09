/*
 *  Copyright (C) 2020-23 Universität zu Köln
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


import {wait} from '../wait';
import {
  ArrayEqualityFunction, doOneIteration, EditCommand, extractSnakes, formatSolution, V_Type
} from "@/toolbox/MyersDiff/MyersDiff";


// Asynchronous version of the MyersDiff algorithm
// When the input to the algorithm is large, it might take a

const STATE_WAITING = 'waiting';
const STATE_RUNNING = 'running';


export const KEEP = 0;
export const ADD = 1;
export const DEL = -1;


export class AsyncMyersDiff {
  private debugMode: boolean;
  private abortNow: boolean;
  private state: string;
  private runCount: number;
  private iterations: number;
  private maxIterations: number;

  constructor() {
    this.debugMode = false;
    this.abortNow = false;
    this.state = STATE_WAITING;
    this.runCount = 0;
    this.iterations = 0;
    this.maxIterations = 0;
  }

  isRunning() {
    return this.state === STATE_RUNNING;
  }

  abort() {
    if (this.state === STATE_RUNNING) {
      this.abortNow = true;
    }
  }

  /**
   *
   * @param {boolean}mode
   */
  setDebugMode(mode: boolean) {
    this.debugMode = mode;
  }


  /**
   * Calculate the shortest edit sequence to convert arrayA into arrayB
   *
   * Based on Myers, Eugene W. "An O(ND) Difference Algorithm and Its Variations", 1986
   *
   * @param arrayA
   * @param arrayB
   * @param isEqual function that returns true if two array elements are equal
   * @return array of objects
   *     {   index: II,             // index in arrayA
   *         command:  -1 | 0 | 1   // (-1 = DEL, 0 = KEEP, 1 = ADD),
   *         seq : XX               // index in the edited array
   *        }
   */
  calculate(arrayA: any[], arrayB: any[], isEqual: ArrayEqualityFunction): Promise<EditCommand[] | null> {
    return new Promise(async (resolve) => {
      this.state = 'running';
      this.runCount++;
      let runNumber = this.runCount;
      this.debugMode && console.log(`Starting run ${runNumber}`);
      this.iterations = 0;
      let n = arrayA.length;
      let m = arrayB.length;
      let max = m + n;

      // Keep a copy of $v after each iteration of $d.
      let v_save: V_Type[] = [];

      // Find the shortest "D-path".
      // since v will have negative indexes, it is an object not an array
      let v: V_Type = {};
      v[1] = 0;  // $v = [1 => 0];

      this.maxIterations = max;

      for (let d = 0; d <= max; ++d) {
        if (this.abortNow) {
          this.state = STATE_WAITING;
          this.abortNow = false;
          this.debugMode && console.log(`Run ${runNumber} aborted`);
          resolve(null);
          return;
        }
        this.iterations = d;
        let solutionFound = false;
        let iterationResult = doOneIteration({d, v, v_save, m, n, arrayA, arrayB, isEqual});
        await wait(0); // give JS a chance to process other stuff
        solutionFound = iterationResult.solutionFound;
        v = iterationResult.v;
        v_save = iterationResult.v_save;
        if (solutionFound) {
          break;
        }
      }

      // Extract the solution by back-tracking through the saved results.
      let snakes = extractSnakes(v_save, n, m);
      let solution = formatSolution(snakes);
      this.state = 'waiting';
      this.debugMode && console.log(`Finished run ${runNumber}`);
      this.iterations = 1;
      resolve(solution);
    });

  }

  getIterations() {
    return this.iterations;
  }

  getMaxIterations() {
    return this.maxIterations;
  }
}











