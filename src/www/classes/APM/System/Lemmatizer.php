<?php

namespace APM\System;

use function DI\string;

class Lemmatizer
{
    // const CMD_PREFIX = "python3 " . __DIR__ . "/../../../../python/Lemmatizer_Indexing.py" ;

    static public function runLemmatizer($lang, $text_clean)
    {
        //exec(self::CMD_PREFIX . " $lang $text_clean", $tokens_and_lemmata);

        switch ($lang) {
            case 'la':
                $lang = 'latin';
                break;
            case 'ar':
                $lang = 'arabic';
                break;
            case 'he':
                $lang = 'hebrew';
                break;
        }

        $tempfile = 'lemmatization_temp.txt';

        exec("touch $tempfile");

        file_put_contents($tempfile, $text_clean);

        exec("curl -s -F data=@$tempfile -F model=$lang -F tokenizer= -F tagger= https://lindat.mff.cuni.cz/services/udpipe/api/process", $data);

        exec("rm $tempfile");


        return self::formatData($data[6], $lang);
    }

    static private function formatData ($data, $lang) {

        $tokens_and_lemmata = [[], []];

        // split data into encoded sentences
        $data = explode('text', $data);

        // remove metadata from the api response
        $data = array_values(array_slice($data, 1));
        //print("ARRAY OF ENCODED SENTENCES\n");
        //print_r($data);

        switch ($lang) {
            case 'latin':

                // convert encoded sentences to arrays of encoded tokens
                foreach ($data as $sentence) {
                    $sentence = str_replace('\n#', '', $sentence);
                    $numTokens = substr_count($sentence, '\n');

                    for ($i = 1; $i < $numTokens; $i++) {
                        $sentence = str_replace('\n' . $i, '\nTOKEN', $sentence);
                    }

                    $sentence = explode('\nTOKEN', $sentence);
                    $sentence = array_values(array_slice($sentence, 1));

                    //print("SENTENCE AS ARRAY OF ENCODED TOKENS\n");
                    //print_r($sentence);

                    // drop integers at the beginning of encoded tokens
                    for ($j = 0; $j < 10; $j++) {
                        foreach ($sentence as $k=>$token) {
                            if (substr($token, 0, 1) === (string) $j) {
                                $sentence[$k] = substr($token, 1);
                            }
                        }
                    }

                    //print("SENTENCE AS ARRAY OF ENCODED TOKENS WITHOUT INTEGERS\n");
                    //print_r($sentence);

                    // extract tokens and lemmata out of the encoded tokens
                    foreach ($sentence as $encToken) {
                        $decToken = explode('\t', $encToken);
                        //print("DECODED TOKEN\n");
                        //print_r($decToken);
                        $tokens_and_lemmata[0][] = $decToken[1];
                        $tokens_and_lemmata[1][] = $decToken[2];
                    }
                }
                break;

            case 'arabic':

                foreach ($data as $sentence) {
                    $sentence = str_replace('\n#', '', $sentence);
                    $numTokens = substr_count($sentence, '\n');

                    for ($i = 1; $i < $numTokens; $i++) {
                        $sentence = str_replace('\n' . $i, '\nTOKEN', $sentence);
                    }

                    $sentence = explode('\nTOKEN', $sentence);
                    $sentence = array_values(array_slice($sentence, 1));
                    //print("SENTENCE AS ARRAY OF ENCODED TOKENS\n");
                    //print_r($sentence);

                    // drop integers at the beginning of encoded tokens as well as unlemmatized token duplicates
                    for ($j = 0; $j < 10; $j++) {
                        foreach ($sentence as $k=>$token) {
                            if (substr($token, 0, 1) === (string) $j) {
                                $sentence[$k] = substr($token, 1);
                            }
                            if (str_starts_with($token, "-")) {
                                unset($sentence[$k]);
                            }
                        }
                    }

                    $sentence = array_values($sentence);

                    //print("SENTENCE AS ARRAY OF ENCODED TOKENS WITHOUT INTEGERS AND UNLEMMATIZED DUPLICATES\n");
                    //print_r($sentence);

                    // extract tokens and lemmata out of the encoded tokens
                    foreach ($sentence as $encToken) {
                        $decToken = explode('\t', $encToken);
                        //print("DECODED TOKEN\n");
                        //print_r($decToken);
                        $tokens_and_lemmata[0][] = $decToken[1];
                        $tokens_and_lemmata[1][] = $decToken[2];
                    }
                }

                break;

            case 'hebrew':
                print($data);
                break;
        }

        print_r($tokens_and_lemmata);
        return $tokens_and_lemmata;
    }

}