<?php

namespace APM\CommandLine;

class CliToolBox
{
    public static function printStdErr($str): void
    {
        fwrite(STDERR, $str);
    }

    public static function printErrorMessage($str): void
    {
        fwrite(STDERR, "ERROR: $str");
    }

    public static function getAnswerFromCommandLine(string $question) : string {
        print $question;
        return fgets(STDIN);
    }

    public static function userRespondsYes(string $question) : bool {
        $question = trim($question);
        $question = "$question Type 'yes' to proceed: ";
        return strtolower(trim(self::getAnswerFromCommandLine($question))) === 'yes';
    }

    public static function sanitizeArg(string $arg, bool $normalizeCase = true) : string {
        $arg = trim($arg);
        if  ($normalizeCase) {
            $arg = strtolower($arg);
        }
        return $arg;
    }

}