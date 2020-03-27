<?php

/**
 * 
 * Adapted from 
 *   https://github.com/fisharebest/algorithm/blob/master/src/MyersDiff.php
 * 
 * @package   fisharebest/algorithm
 * @author    Greg Roach <greg@subaqua.co.uk>
 * @copyright (c) 2015 Greg Roach <greg@subaqua.co.uk>
 * @license   GPL-3.0+
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
namespace APM\ToolBox;

/**
 * Find the shortest edit sequence to transform one string into another.
 *
 * Based on Myers, Eugene W. "An O(ND) Difference Algorithm and Its 
 *     Variations", 1986
 *
 */
class MyersDiff 
{
    /** Instruction to delete a token which only appears in the 
     * first sequence */
    const DELETE = -1;

    /** Instruction to keep a token which is common to both sequences */
    const KEEP = 0;

    /** Instruction to insert a token which only appears in the 
     * last sequence */
    const INSERT = 1;

    /**
     * Backtrack through the intermediate results to extract the 
     * "snakes" that
     * are visited on the chosen "D-path".
     *
     * @param int[] $v_save Intermediate results
     * @param int      $x      End position
     * @param int      $y      End position
     *
     * @return int[][]
     */
    private static function extractSnakes(array $v_save, $x, $y) : array
    {
        $snakes = array();
        for ($d = count($v_save) - 1; $x >= 0 && $y >= 0; --$d) {
                array_unshift($snakes, array($x, $y));

                $v = $v_save[$d];
                $k = $x - $y;

                if ($k === -$d || $k !== $d && $v[$k - 1] < $v[$k + 1]) {
                        $k_prev = $k + 1;
                } else {
                        $k_prev = $k - 1;
                }

                $x = $v[$k_prev];
                $y = $x - $k_prev;
        }

        return $snakes;
    }

    /**
     * Convert a list of "snakes" into a set of insert/keep/delete
     * instructions
     *
     * @param integer[][] $snakes Common subsequences
     *
     * @return array
     */
    private static function formatSolution(array $snakes) : array
    {
        $solution = [];
        $x = 0;
        $y = 0;
        $seq = 0;
        foreach ($snakes as $snake) {
            // Horizontals
            while ($snake[0] - $snake[1] > $x - $y) {
                $solution[] = [$x, self::DELETE, -1];
                ++$x;
            }
            // Verticals
            while ($snake[0] - $snake[1] < $x - $y) {
                $solution[] = array($y, self::INSERT, $seq);
                ++$y;
                ++$seq;
            }
            // Diagonals
            while ($x < $snake[0]) {
                $solution[] = array($x, self::KEEP, $seq);
                ++$x;
                ++$y;
                ++$seq;
            }
        }

        return $solution;
    }

    /**
     * Calculate the shortest edit sequence to convert $a into $b
     *
     * @param array $a - tokens (any type)
     * @param array $b - tokens (any type)
     * @param callable $equals - function to compare the values of
     *            two tokens --> $compareValues($x, $y) : should return
     *            true if $x == $y
     *
     * @return array[] - sequence of edit commands as triplets: 
     *                    $index
     *                    $command (-1 = DEL, 0 = KEEP, 1 = ADD),
     *                    $seq : $index in the edited array
     */
    public static function calculate(array &$a, array &$b, callable $equals) : array
    {
        // The algorithm uses array keys numbered from zero.
        $n = count($a);
        $m = count($b);
        //$a = array_values($a);
        //$b = array_values($b);
        $max = $m + $n;

        // Keep a copy of $v after each iteration of $d.
        $v_save = [];

        // Find the shortest "D-path".
        $v = [1 => 0];
        for ($d = 0; $d <= $max; ++$d) {
            // Examine all possible "K-lines" for this "D-path".
            for ($k = -$d; $k <= $d; $k += 2) {
                if ($k === -$d || $k !== $d && $v[$k - 1] < $v[$k + 1]) {
                    // Move down.
                    $x = $v[$k + 1];
                } else {
                    // Move right.
                    $x = $v[$k - 1] + 1;
                }
                // Derive Y from X.
                $y = $x - $k;
                // Follow the diagonal.
                while ($x < $n && $y < $m && call_user_func($equals,$a[$x], $b[$y])) {
                    ++$x;
                    ++$y;
                }
                // Just store X, as we can calculate Y (from X + K).
                $v[$k] = $x;
                $v_save[$d] = $v;
                // Solution found?
                if ($x === $n && $y === $m) {
                    break 2;
                }
            }
        }

        // Extract the solution by back-tracking through the saved results.
        $snakes = self::extractSnakes($v_save, $n, $m);

        // Format the snakes as a set of instructions.
        return self::formatSolution($snakes);
    }
}

