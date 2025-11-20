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

export const KEEP = 0;
export const ADD = 1;
export const DEL = -1;


export type ArrayEqualityFunction = (a: any, b: any) => boolean;

export type V_Type = {
  [key: number]: number
}

export interface EditCommand {
  index: number,
  command: number,
  seq: number
}

export interface IterationParams {
  d: number,
  v: V_Type,
  v_save: V_Type[],
  m: number,
  n: number,
  arrayA: any[],
  arrayB: any[],
  isEqual: ArrayEqualityFunction
}

export interface IterationResult {
  solutionFound: boolean,
  v: V_Type,
  v_save: V_Type[]
}

/**
 * Calculate the shortest edit sequence to convert arrayA into arrayB
 *
 * Based on Myers, Eugene W. "An O(ND) Difference Algorithm and Its Variations", 1986
 *
 * @param arrayA
 * @param arrayB
 * @param isEqual function that returns true if two array elements are equal
 * @param debugMode
 * @return array of objects
 *     {   index: II,             // index in arrayA
 *         command:  -1 | 0 | 1   // (-1 = DEL, 0 = KEEP, 1 = ADD),
 *         seq : XX               // index in the edited array
 *        }
 */
export function calculate(arrayA: any[], arrayB: any[], isEqual: ArrayEqualityFunction, debugMode = false): EditCommand[] {
  if (debugMode) {
    console.groupCollapsed('MyersDiff');
  }

  let n = arrayA.length;
  let m = arrayB.length;
  let max = m + n;

  // Keep a copy of $v after each iteration of $d.
  let v_save: V_Type[] = [];

  // Find the shortest "D-path".

  // since v will have negative indexes, it is an object not an array
  let v: V_Type = {};
  v[1] = 0;  // $v = [1 => 0];

  for (let d = 0; d <= max; ++d) {
    let solutionFound = false;
    let iterationResult = doOneIteration({d, v, v_save, m, n, arrayA, arrayB, isEqual});
    solutionFound = iterationResult.solutionFound;
    v = iterationResult.v;
    v_save = iterationResult.v_save;
    if (solutionFound) {
      break;
    }
  }

  if (debugMode) {
    console.log(`v_save`);
    console.log(v_save);
  }

  // Extract the solution by back-tracking through the saved results.
  let snakes = extractSnakes(v_save, n, m);

  if (debugMode) {
    console.log(`Snakes`);
    console.log(snakes);
  }
  let solution = formatSolution(snakes, debugMode);

  if (debugMode) {
    console.log(`Solution`);
    console.log(solution);
    console.groupEnd();
  }

  // Format the snakes as a set of instructions.
  return solution;
}

export function formatSolution(snakes: number[][], debugMode: boolean = false): EditCommand[] {
  let solution = [];
  let x = 0;
  let y = 0;
  let seq = 0;

  for (let i = 0; i < snakes.length; i++) {
    // Horizontals
    let snake = snakes[i];
    while ((snake[0] - snake[1]) > (x - y)) {
      // delete
      if (debugMode) {
        console.log(`Snake ${i}, index ${x}, command -1, seq -1`);
      }
      solution.push({index: x, command: DEL, seq: -1});
      x++;
    }
    // Verticals
    while (snake[0] - snake[1] < x - y) {
      // insert
      if (debugMode) {
        console.log(`Snake ${i}, index ${y}, command 1, seq ${seq}`);
      }
      solution.push({index: y, command: ADD, seq: seq});
      y++;
      seq++;
    }
    // Diagonals
    while (x < snake[0]) {
      // keep
      if (debugMode) {
        console.log(`Snake ${i}, index ${x}, command 0, seq ${seq}`);
      }
      solution.push({index: x, command: KEEP, seq: seq});
      x++;
      y++;
      seq++;
    }
  }
  return solution;
}

export function extractSnakes(v_save: V_Type[], x: number, y: number): number[][] {
  let snakes: number[][] = [];
  //console.log('Extracting snakes')
  //console.log({ v_save: v_save, x: x, y: y})
  for (let d = v_save.length - 1; x >= 0 && y >= 0; --d) {
    snakes.unshift([x, y]);  //  i.e. add [x,y] at the beginning of the snakes array

    let v = v_save[d];
    let k = x - y;

    let k_prev = -1;   // it doesn't matter which initial values k_prev has
    if (k === -d || (k !== d && v[k - 1] < v[k + 1])) {
      k_prev = k + 1;
    } else {
      k_prev = k - 1;
    }
    x = v[k_prev];
    y = x - k_prev;
  }

  return snakes;
}

export function doOneIteration(params: IterationParams): IterationResult {

  let {d, v, v_save, m, n, arrayA, arrayB, isEqual} = params;

  // Examine all possible "K-lines" for this "D-path".
  for (let k = -d; k <= d; k += 2) {
    let x = -1;  // it does not matter x's initial value, it will be overwritten in the next if-else statement
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
      return {solutionFound: true, v: v, v_save: v_save};
    }
  }
  return {solutionFound: false, v: v, v_save: v_save};
}




