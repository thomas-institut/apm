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


import { wait } from './FunctionUtil.mjs'

// Asynchronous version of the MyersDiff algorithm
// When the input to the algorithm is large, it might take a

export const KEEP = 0
export const ADD = 1
export const DEL = -1


const STATE_WAITING = 'waiting'
const STATE_RUNNING = 'running'

export class AsyncMyersDiff {

  constructor () {
    this.debugMode = false
    this.abortNow = false
    this.state = STATE_WAITING
    this.runCount = 0
    this.iterations = 0
    this.maxIterations = 0
  }

  isRunning() {
    return this.state === STATE_RUNNING
  }

  abort() {
    if (this.state === STATE_RUNNING) {
      this.abortNow = true
    }
  }

  /**
   *
   * @param {boolean}mode
   */
  setDebugMode(mode) {
    this.debugMode = mode
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
  calculate(arrayA, arrayB, isEqual) {
    return new Promise( async (resolve) => {
      this.state = 'running'
      this.runCount++
      let runNumber = this.runCount
      this.debugMode && console.log(`Starting run ${runNumber}`)
      this.iterations = 0
      let n = arrayA.length
      let m = arrayB.length
      let max = m + n

      // Keep a copy of $v after each iteration of $d.
      let v_save = [];

      // Find the shortest "D-path".

      // since v will have negative indexes, it is an object not an array
      let v = {}
      v[1] = 0  // $v = [1 => 0];

      this.maxIterations = max

      for (let d = 0; d <= max; ++d) {
        if (this.abortNow) {
          this.state = STATE_WAITING
          this.abortNow = false
          this.debugMode && console.log(`Run ${runNumber} aborted`)
          resolve(null)
          return
        }
        this.iterations = d;
        let solutionFound = false
        let iterationResult = await this.doOneIteration(d, v, v_save, m, n, arrayA, arrayB, isEqual)
        await wait(0) // give JS a chance to process other stuff
        solutionFound = iterationResult['solutionFound']
        v = iterationResult['v']
        v_save = iterationResult['v_save']
        if (solutionFound) {
          break
        }
      }

      // if (this.debugMode) {
      //   console.log(`v_save`)
      //   console.log(v_save)
      // }

      // Extract the solution by back-tracking through the saved results.
      let snakes = await this.extractSnakes(v_save, n, m);

      // if (this.debugMode) {
      //   console.log(`Snakes`)
      //   console.log(snakes)
      // }
      let solution = await this.formatSolution(snakes)

      // if (this.debugMode) {
      //   console.log(`Solution`)
      //   console.log(solution)
      //   console.groupEnd()
      // }
      this.state = 'waiting'
      this.debugMode && console.log(`Finished run ${runNumber}`)
      this.iterations = 1
      resolve(solution)
    })

  }

  getIterations() {
    return this.iterations
  }

  getMaxIterations() {
    return this.maxIterations
  }

  /**
   * @private
   * @param d
   * @param v
   * @param v_save
   * @param m
   * @param n
   * @param arrayA
   * @param arrayB
   * @param isEqual
   * @return {Promise<unknown>}
   */
  doOneIteration(d, v, v_save, m, n, arrayA, arrayB, isEqual) {
    return new Promise( (iterationResolve) => {
      // Examine all possible "K-lines" for this "D-path".
      for (let k = -d; k <= d; k += 2) {
        let x = -1  // it does not matter x's initial value, it will be overwritten in the next if-else statement
        if (k === -d || k !== d && v[k - 1] < v[k + 1]) {
          // Move down.
          x = v[k + 1];
        } else {
          // Move right.
          x = v[k - 1] + 1;
        }
        // Derive Y from X.
        let y = x - k;
        // Follow the diagonal.
        while (x < n && y < m && isEqual(arrayA[x], arrayB[y])) {
          ++x;
          ++y;
        }
        // Just store X, as we can calculate Y (from X + K).
        v[k] = x;
        v_save[d] = JSON.parse(JSON.stringify(v));  //  i.e. store a copy of the object v in v_save
        // Solution found?
        if (x === n && y === m) {
          iterationResolve({solutionFound: true, v: v, v_save: v_save })
        }
      }
      iterationResolve({solutionFound: false, v: v, v_save: v_save })
    })
  }

  /**
   * @private
   * @param snakes
   * @return {Promise<unknown>}
   */
  formatSolution(snakes) {
    return new Promise( (resolve) => {
      let solution = []
      let x = 0
      let y = 0
      let seq = 0

      for (let i = 0; i < snakes.length; i++) {
        // Horizontals
        let snake = snakes[i]
        while ( (snake[0] - snake[1]) > (x - y)) {
          // delete
          // if (this.debugMode) {
          //   console.log(`Snake ${i}, index ${x}, command -1, seq -1`)
          // }
          solution.push({ index: x, command: DEL, seq: -1 })
          x++;
        }
        // Verticals
        while (snake[0] - snake[1] < x - y) {
          // insert
          // if (this.debugMode) {
          //   console.log(`Snake ${i}, index ${y}, command 1, seq ${seq}`)
          // }
          solution.push({ index: y, command: ADD, seq: seq })
          y++
          seq++
        }
        // Diagonals
        while (x < snake[0]) {
          // keep
          // if (this.debugMode) {
          //   console.log(`Snake ${i}, index ${x}, command 0, seq ${seq}`)
          // }
          solution.push({ index: x, command: KEEP, seq: seq })
          x++
          y++
          seq++
        }
      }
      resolve(solution)
    })

  }

  /**
   * @private
   * @param v_save
   * @param x
   * @param y
   * @return {Promise<unknown>}
   */
  extractSnakes(v_save, x, y) {
    return new Promise ( (resolve) => {
      let snakes = [];

      for (let d = v_save.length - 1; x >= 0 && y >= 0; --d) {
        snakes.unshift([x,y])  //  i.e. add [x,y] at the beginning of the snakes array

        let v = v_save[d];
        let k = x - y;

        let k_prev = -1   // it doesn't matter which initial values k_prev has
        if (k === -d || (k !== d && v[k - 1] < v[k + 1])) {
          k_prev = k + 1;
        } else {
          k_prev = k - 1;
        }

        x = v[k_prev];
        y = x - k_prev;
      }

      resolve(snakes);
    })
  }

}











