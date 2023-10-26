<?php

namespace ThomasInstitut\EntitySystem;

use RuntimeException;
use ThomasInstitut\TimeString\TimeString;

/**
 * This class provides the basic functions to deal with Thomas-Institut entity IDs (TID)
 *
 * TIDs are 64-bit integers greater than 0 that are uniquely generated using the current system timestamp up to
 * the millisecond.
 *
 * The formula is:
 *
 *   TID =  intval( 1000 * current_timestamp_in_microseconds)  = intval( 1000 * microtime(true))
 *
 *  The generating algorithm makes sure that different TIDs are generated when the timestamp at
 *  the generation event of two TIDs is the same up to the millisecond.
 *
 * A 1 to 1 equivalence exists between any TID less than 2^60 and a valid UUID constructed by
 * concatenating the 60 least significant bits of the TID with a 48 bit unique MAC address stored
 * in this class. This MAC address must NEVER be modified.  As of 2023, there is no actual need to
 * use this equivalence, but in the future it may be used to easily migrate to a UUID-based system.
 * The functions in this class assume that the maximum valid TID is 2^60 - 1.
 *
 * TIDs can be represented alphanumerically by converting their integer value to a base-36 (A-Z, 0-9) string.
 * Only 8 alphanumeric characters are needed for TIDs generated before 2059-05-25 17:38:27 UTC. [N1]
 * Any unique string of less than 12 alphanumeric characters can represent a valid TID, and any string of less
 * than 11 can represent a TID that has a valid equivalent UUID.
 *
 * Obviously, a string composed of only numbers is a valid alphanumeric string and will not represent
 * the TID with the numerical value equal to the numerical value of the string read in base 10. For example,
 * '1234' does not represent TID 1234. However, if a numerical string has 12 digits or more, it will not represent
 * a valid TID in base-36. This fact can be used to support both base-36 and base-10 decoding of a string at the same
 * time. Any numeric string that decodes to 1e11 or more can be taken to be a TID in base-10, that is, any TID
 * generated after March 3, 1973 9:46:40 UTC, which is any automatically generated TID in the Averroes Project.
 *
 * It is possible to have "custom" TIDs based on meaningful strings. For example, the string
 * 'Averroes' is equivalent to TID 852015060820, which would have been generated automatically
 * on December 31, 1996 6:51:00.820 UTC,  'Aristotle' is equivalent to TID 30367856507090,
 * which will be generated automatically exactly on April 26, 2932 19:41:47.090 UTC. The chances of repeating
 * one of these custom TIDs by normal time-based generation are virtually zero.
 *
 * Notes:
 *   N1. Having a reasonably short alphanumeric representation of TIDs for the next few years is the reason why a
 *       1-millisecond clock resolution was chosen. A 1-microsecond resolution, which is the maximum technically
 *       possible, requires 10 alphanumeric characters, whereas lower resolutions are not desirable because
 *       there are more chances of getting repeated ids at the first try in the generation algorithm.
 *
 */
class EntityId
{

    const TI_UUID_MAC_ADDRESS = 47103254751;
    const LOCK_FILE = '/tmp/ti-entity-id-generator-lock-file';


    /**
     * Generates a unique TID based on the current time
     * @return int
     */
    public static function generateUnique(): int {
        if (!file_exists(self::LOCK_FILE)) {
            self::createLockFile();
        }
        $lockFile = fopen(self::LOCK_FILE, "r+");
        if ($lockFile === false) {
            throw new RuntimeException("Can't open lock file");
        }
        if (flock($lockFile, LOCK_EX)) {
            $lastIdGeneratedId = intval(fgets($lockFile));
            $newId = self::getIdFromClock();
            if ($newId === $lastIdGeneratedId) {
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

    public static function tidToTimeString(int $tid) : string {

        if ($tid < 1e14) {
            return TimeString::fromTimeStamp($tid/1000);
        }
        $ts = TimeString::fromTimeStamp(intval($tid/1000));

        return substr($ts, 0, strlen($ts) -7);
    }

    /**
     * Converts a string to a TID. If the string is not a valid TID, returns -1.
     * Dashes, periods and spaces within the string are ignored, e.g. 'AB C-123.DEF' becomes 'ABC123DEF'
     *
     * If the string is all numbers and its length is 13 or more, it is considered to
     * be a base-10 TID, otherwise it is interpreted as a base-36 number.
     *
     * @param string $str
     * @return int
     */
    public static function strToTid(string $str) : int {
        $str = str_replace(['-', '.', ' ', "\n"], '', $str);
        if (strlen($str) >= 12 and self::isAllNumbers($str)) {
            return intval($str);
        }
        if (self::strIsValidTid($str)) {
            return self::alphanumericToTid($str);
        }
        return -1;
    }

    public static function alphanumericToTid(string $alpha) : int {
        return intval(base_convert($alpha, 36, 10));
    }

    public static function strIsValidTid(string $str) : bool {
        if (strlen($str) > 11) {
            return false;
        }
        $validCharacters = "0123456789abcdefghijklmnopqrstuvwxyz";

        $normalizedString = strtolower($str);

        for ($i = 0; $i < strlen($str); $i++) {
            if (!str_contains($validCharacters, $normalizedString[$i])){
                return false;
            }
        }
        return true;
    }

    public static function tidToHex(int $tid) : string {
        return strtoupper(base_convert(strval($tid), 10, 16));
    }
    public static function tidToAlphanumeric(int $tid) : string {
        return strtoupper(base_convert(strval($tid), 10, 36));
    }

    private static function getIdFromClock() : int{
        return intval(1000*microtime(true));
    }

    private static function createLockFile() : void {
        touch(self::LOCK_FILE);
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