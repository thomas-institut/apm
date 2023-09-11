<?php

namespace APM\ToolBox;

class BaseUrlDetector
{

    static public function detectBaseUrl(string $subDir = '') : string{
        $host = $_SERVER['HTTP_HOST'];
        $port = $_SERVER['SERVER_PORT'];

        if (isset($_SERVER['HTTP_X_FORWARDED_PORT'])) {
            $port = $_SERVER['HTTP_X_FORWARDED_PORT'];
        }
        $protocol = 'http';
        if (isset($_SERVER['HTTP_X_FORWARDED_PROTO'])) {
            // check for https in the forwarded protocols
            $forwardedProtocols = explode(',', $_SERVER['HTTP_X_FORWARDED_PROTO']);
            for ($i = 0; $i < count($forwardedProtocols); $i++) {
                if ($forwardedProtocols[$i] === 'https') {
                    $protocol = 'https';
                    break;
                }
            }
        }
        if ($port === '443') {
            $protocol = 'https';
        }
        if ($subDir !== '') {
            $subDir = '/' . $subDir;
        }
        return "$protocol://$host$subDir";

    }
}