<?php

namespace ThomasInstitut\EntitySystem;

use RuntimeException;
use ThomasInstitut\TimeString\InvalidTimeZoneException;
use ThomasInstitut\TimeString\TimeString;

/**
 * This class provides the basic functions to deal with Thomas-Institut entity IDs (TIDs)
 *
 * TIDs are positive 64-bit integers that are uniquely generated using the current system timestamp up to
 * the millisecond. [N1]
 *
 * The formula is:
 *
 *   `TID =  intval( 1000 * current_timestamp_in_microseconds)  = intval( 1000 * microtime(true))`
 *
 * The generating algorithm makes sure that different TIDs are generated when the timestamp at
 * the generation event of two TIDs is the same up to the millisecond. This is accomplished by
 * using a lock file stored in the system's `/tmp` folder
 *
 * A 1 to 1 equivalence exists between all TIDs less than 2^60 and a valid UUID. The equivalent UUID can be
 * constructed by concatenating the 60 least significant bits of the TID with a unique 48-bit id, for example,
 * a MAC address. This class does not provide that conversion, but it may in future versions if the need
 * arises. However, it is prudent to guarantee that the equivalence holds, so the maximum valid TID is stipulated to
 * be 2^60 - 1 = 1152921504606846975 (~ 1.153 x 10^18). The generation algorithm will not generate the maximum TID for
 * the next 36 million years.
 *
 * TIDs can be represented alphanumerically by converting their integer value to a base-36 (0-9, A-Z) string.
 * The maximum TID is 8RC4KBDVSS1R in base-36, a 12 character string. However, no more than 8 alphanumeric characters are
 * needed for TIDs generated before 2059-05-25 17:38:27 UTC, and no more than 9 for those before the year 5188. [N2]
 * Since the first TID with a base-36 representation of 8 characters would have been generated very early on Jan 1,
 * 1970, for all practical purposes we can safely assume that base-36 representations of generated TIDs are either 8 o 9
 * characters long.
 *
 * We can use this to stipulate that (1) any given string consisting of only numbers (0-9) whose length is less than 8 or
 * more than 9, is to be interpreted as a TID in base-10, and (2) any other string that is a valid base-36 string
 * is to be interpreted as a TID in base-36. For readability purposes, we will also allow dashes ('-') and dots ('.')
 * within base-36 strings; those are simply ignored when interpreting the string. The fromString method implements
 * these rules.
 *
 * Notes:
 *   N1. Zero is not a valid TID. The smallest TID is 1.
 *   N2. Having a reasonably short alphanumeric representation of TIDs for the next few years is the reason why a
 *       1-millisecond clock resolution was chosen. A 1-microsecond resolution, which is the maximum technically
 *       possible, requires 10 alphanumeric characters, whereas lower resolutions are not desirable because
 *       there are more chances of getting repeated ids in the first try in the generation algorithm.
 *
 */
class Tid
{


    private static string $lockFileName = '/tmp/ti-entity-id-generator-lock-file';


//    private static int $uniqueIdForUuidConversion = 47103254751;

    const int MAX_TID =  1152921504606846975;



    /**
     * Generates a unique TID based on the current time
     * @return int
     */
    public static function generateUnique(): int {
        if (!file_exists(self::$lockFileName)) {
            self::createLockFile();
        }
        $lockFile = fopen(self::$lockFileName, "r+");
        if ($lockFile === false) {
            throw new RuntimeException("Can't open lock file");
        }
        if (flock($lockFile, LOCK_EX)) {
            $lockFileContents = fgets($lockFile);
            $lastIdGeneratedId = intval(trim($lockFileContents));
            $newId = self::getIdFromClock();
            while ($newId <= $lastIdGeneratedId) {
                $newId++;
            }
            ftruncate($lockFile,0);
            fwrite($lockFile, strval($newId) );
            fflush($lockFile);
            fclose($lockFile);
            return $newId;
        } else {
            throw new RuntimeException("Can't get lock");
        }
    }

    /**
     * @throws InvalidTimeZoneException
     */
    public static function toTimeString(int $tid, string $timeZone = '') : string {
        // need to do this trick with strings because if the TID is a very big number
        // the time string from $tid/1000 will be inaccurate
        $strTid = strval($tid);
        $secondsTimeStamp = intval(substr($strTid, 0, strlen($strTid) -3));
        $milliseconds = intval(substr($strTid, -3));
        $ts = TimeString::fromTimeStamp($secondsTimeStamp, $timeZone);
        return sprintf("%s.%03d000", substr($ts, 0, strlen($ts) -7), $milliseconds);
    }

    /**
     * Converts a string to a TID. If the string cannot be converted to a valid TID, returns -1.
     *
     * If $strictBase36 is true, the string is interpreted as a base-36 number.
     *
     * If $strictBase36 is false and the string is all numbers with length <=7 or >=10 it is interpreted as
     * a base-10 TID, otherwise it is interpreted as a base-36 number. See the class documentation for
     * an explanation why this is reasonable in practical terms.
     *
     * When processing base-36 strings, dashes and periods within the string are ignored, e.g. 'ABC-123.DEF' becomes 'ABC123DEF'.
     * This allows for some extra readability in base-36 strings.
     *
     * If the given string is not a valid TID returns -1.
     *
     * @param string $str
     * @param bool $strictBase36
     * @return int
     */
    public static function fromString(string $str, bool $strictBase36 = false) : int {

        if (!$strictBase36 && self::isAllNumbers($str)) {
            $strlen = strlen($str);
            if ($strlen <=7 || $strlen >=10) {
                return intval($str);
            }
        }
        $str = str_replace(['-', '.'], '', $str);
        if (self::strIsValidBase36($str)) {
            return self::fromBase36String($str);
        }
        return -1;
    }

    public static function fromBase36String(string $str) : int {
        $val = intval(base_convert($str, 36, 10));
        if ($val <= 0) {
            return -1;
        }
        if ($val > self::MAX_TID) {
            return -1;
        }
        return $val;
    }

    /**
     * Returns the canonical base-36 representation of a TID:
     * an 8 or 9 string with uppercase letters, padded with zeroes on the left
     *
     *
     * If $addCosmeticDash is true (the default), a dash will be inserted to separate the last
     * four characters from the rest.
     *
     * For example, 1735941183123 => 'M5HA-K5G3', 1281232313 => '00L6-T96H'
     *
     * @param int $tid
     * @param bool $addCosmeticDash
     * @return string
     */
    public static function toBase36String(int $tid, bool $addCosmeticDash = true) : string {
        $str = strtoupper(str_pad(base_convert(strval($tid), 10, 36), 8, '0', STR_PAD_LEFT));
        if ($addCosmeticDash) {
            $dashPosition = strlen($str) - 4;
            return substr($str, 0, $dashPosition) . '-' . substr($str, $dashPosition);
        } else {
            return $str;
        }
    }


    /**
     * Returns true if the given string is a valid base-36 number
     * @param string $str
     * @return bool
     */
    public static function strIsValidBase36(string $str) : bool {

        $validCharacters = "0123456789abcdefghijklmnopqrstuvwxyz";

        $normalizedString = strtolower($str);

        for ($i = 0; $i < strlen($str); $i++) {
            if (!str_contains($validCharacters, $normalizedString[$i])){
                return false;
            }
        }
        return true;
    }

    public static function toHexString(int $tid) : string {
        return strtoupper(base_convert(strval($tid), 10, 16));
    }


    public static function fromTimestamp(float $timestamp) : int {
        return intval(1000*$timestamp);
    }

    private static function getIdFromClock() : int{
        return self::fromTimestamp(microtime(true));
    }

    private static function createLockFile() : void {
        touch(self::$lockFileName);
    }

    private static function isAllNumbers(string $str) : bool {
        $validCharacters = "0123456789";
        for ($i = 0; $i < strlen($str); $i++) {
            if (!str_contains($validCharacters, $str[$i])){
                return false;
            }
        }
        return true;
    }

}