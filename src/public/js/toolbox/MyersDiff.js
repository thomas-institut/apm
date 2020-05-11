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
export function calculate(arrayA, arrayB, isEqual) {
  //console.log('Start MyersDiff')
  let n = arrayA.length
  let m = arrayB.length
  let max = m + n

  // Keep a copy of $v after each iteration of $d.
  let v_save = [];

  // Find the shortest "D-path".

  // since v will have negative indexes, it is an object not an array
  let v = {}
  v[1] = 0  // $v = [1 => 0];

  for (let d = 0; d <= max; ++d) {
    let solutionFound = false
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
        solutionFound = true
        break
      }
    }
    if (solutionFound) {
      break
    }
  }
  // Extract the solution by back-tracking through the saved results.
  let snakes = extractSnakes(v_save, n, m);

  // Format the snakes as a set of instructions.
  return formatSolution(snakes);
}

function formatSolution(snakes) {
  let solution = []
  let x = 0
  let y = 0
  let seq = 0

  for (let i = 0; i < snakes.length; i++) {
    // Horizontals
    let snake = snakes[i]
    while ( (snake[0] - snake[1]) > (x - y)) {
      // delete
      solution.push({ index: x, command: -1, seq: -1 })
      x++;
    }
    // Verticals
    while (snake[0] - snake[1] < x - y) {
      // insert
      solution.push({ index: y, command: 1, seq: seq })
      y++
      seq++
    }
    // Diagonals
    while (x < snake[0]) {
      // keep
      solution.push({ index: x, command: 0, seq: seq })
      x++
      y++
      seq++
    }
  }
  return solution
}

function extractSnakes(v_save, x, y) {
  let snakes = [];
  //console.log('Extracting snakes')
  //console.log({ v_save: v_save, x: x, y: y})
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

  return snakes;
}

