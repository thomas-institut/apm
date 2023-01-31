<?php

namespace ThomasInstitut\UUID;

use Exception;

class Uuid
{

    /**
     * @throws Exception
     */
    static function uuid4() : string{
        $data = Uuid::uuid4_bin();

        return Uuid::bin2str($data);
    }

    static function bin2str(string $data) : string {
        $data = substr($data, 0, 16);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    static function str2bin(string $uuid) : string {
        $hex = str_replace('-', '', $uuid);
        return hex2bin($hex);
    }

    static function isValidUuidString(string $str): bool {
        if (strlen($str) !== 36) {
            return false;
        }
        $str = str_replace('-', '', $str);
        if (strlen($str) !== 32) {
            return false;
        }
        if (trim($str, '0..9A..Fa..f') !== '') {
            return false;
        }
        return true;
    }



    /**
     * @throws Exception
     */
    static function uuid4_bin() : string {
        $data = random_bytes(16);

        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // set bits 6-7 to 10
        return $data;
    }
}