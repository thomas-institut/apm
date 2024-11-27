<?php

namespace APM\System;

use function DI\string;

class Lemmatizer
{
    // const CMD_PREFIX = "python3 " . __DIR__ . "/../../../../python/Lemmatizer_Indexing.py" ;

    static public function runLemmatizer($lang, $text_clean)
    {

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

        return self::getTokensAndLemmata($data[6]);
    }

    static private function getTokensAndLemmata ($data) {

        //print($data);

        // array of arrays to be returned
        $tokens_and_lemmata = ['tokens' => [], 'lemmata' => []];

        // split plain text data from the udpipe api into encoded sentences
        $sentences = explode(' text ', $data);
        $sentences = array_values(array_slice($sentences, 1)); // removes metadata which are not a sentence

        // print("ARRAY OF ENCODED SENTENCES\n");
        // print_r($sentences);

        // extract tokens and lemmata from each sentence
        foreach ($sentences as $sentence) {

            // remove irrelevant signs and convert each sentence into an array of still encoded tokens
            $sentence = str_replace('\n#', '', $sentence);

            $sentence = explode("\\n", $sentence);

            foreach ($sentence as $k => $token) {
                if (!str_contains($token, '\t')) {
                    unset($sentence[$k]);
                }
            }

            $sentence = array_values($sentence);

            $complexTokenPositions = [];
            $numComplexTokens = 0;

            // get start and end indices of complex tokens
            foreach ($sentence as $k => $token) {
                if (str_contains(substr($token, 0, 4), '-')) {
                    $token = explode('-', $token);
                    $start = (int)$token[0] + $numComplexTokens;
                    $end = (int)explode('\t', $token[1])[0] + $numComplexTokens;
                    $complexTokenPositions[] = [$start, $end];
                    $numComplexTokens++;
                }
            }

            //foreach ($complexTokenPositions as $k => $pos) {


            //$sentence[$pos[0]-1+$k] = '\tComTokSep\tComTokSep';
            //array_splice($sentence, $pos[1]+($k+1), 0, '\tComTokSep\tComTokSep');
            //}

            //print("SENTENCE AS ARRAY OF ENCODED TOKENS\n");
            //print_r($sentence);

            // normalize the tokens
            // drop integers at the beginning of every encoded tokens and drop the token duplicates which are not lemmatized
            // (it seems like the api lemmatizer returns articles of nouns and the nouns twice (each as a single token with lemmatization
            // and as complex token without lemmatization, these ones are removed)
            for ($i = 0; $i < 5; $i++) {
                // Iterate the process 4 times to make sure that all integers, which represent token numbers, will be deleted,
                // even for very long sentences with a token number with four digits
                for ($j = 0; $j < 10; $j++) {
                    foreach ($sentence as $k => $token) {
                        if (substr($token, 0, 1) === (string)$j or str_starts_with($token, '-')) {
                            $sentence[$k] = substr($token, 1);
                        }
                    }
                }
            }

            // update the array indices
            $sentence = array_values($sentence);


            //print("SENTENCE AS ARRAY OF ENCODED TOKENS WITHOUT INTEGERS AND UNLEMMATIZED DUPLICATES\n");
            //print_r($sentence);

            // extract words and lemmata out of the normalized encoded tokens
            foreach ($sentence as $l => $encToken) {
                $decToken = explode('\t', $encToken);

                // clean tokens and lemmata from underscores
                foreach ($decToken as $k => $elem) {
                    if (str_contains($elem, '_')) {
                        $decToken[$k] = str_replace('_', '', $elem);
                    }
                }

                $sentence[$l] = $decToken;

                //print("DECODED TOKEN\n");
                //print_r($decToken);
                //$tokens_and_lemmata[0][] = $decToken[1];
                //$tokens_and_lemmata[1][] = $decToken[2];
            }


            foreach ($complexTokenPositions as $positions) {
                for ($n = $positions[0]; $n <= $positions[1]; $n++) {
                    if ($n === $positions[0]) {
                        $sentence[$positions[0]-1][2] = " " . $sentence[$n][2] . " ";
                    } else {
                        $sentence[$positions[0]-1][2] = $sentence[$positions[0]-1][2] . " " . $sentence[$n][2] . " ";
                    }
                    unset($sentence[$n]);
                }
            }

            $sentence = array_values($sentence);

            //print_r($sentence);

            foreach ($sentence as $tokenAsList) {
                $tokens_and_lemmata['tokens'][] = $tokenAsList[1];
                $tokens_and_lemmata['lemmata'][] = $tokenAsList[2];
            }
        }
        
        // signal missing words or lemmata in the returned data
        foreach ($tokens_and_lemmata['tokens'] as $word) {
            if ($word === null or $word === '') {
                print("EMPTY WORD IN LIST OF WORDS!\n");
            }
        }

//        foreach ($tokens_and_lemmata[1] as $lemma) {
//            if ($lemma === null or $lemma === '') {
//                print("EMPTY LEMMA IN LIST OF LEMMATA!\n");
//            }
//        }

        //print_r($tokens_and_lemmata['lemmata']);
        return $tokens_and_lemmata;
    }

}