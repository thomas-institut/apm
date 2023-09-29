<?php

namespace APM\System;

class PythonLemmatizer
{
    const CMD_PREFIX = "python3 " . __DIR__ . "/../../../../python/Lemmatizer_Indexing.py" ;

    static public function runLemmatizer($lang, $text_clean, &$tokens_and_lemmata) : void {
        exec(self::CMD_PREFIX . " $lang $text_clean", $tokens_and_lemmata);
    }
}