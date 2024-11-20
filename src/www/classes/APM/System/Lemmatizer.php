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

        // exec("rm $tempfile");

        return self::getTokensAndLemmata($data[6]);
    }

    static private function getTokensAndLemmata ($data) {

        //print($data);

        // array of arrays to be returned
        $words_and_lemmata = [[], []];

        // split plain text data from the udpipe api into encoded sentences
        $sentences = explode(' text ', $data);
        $sentences = array_values(array_slice($sentences, 1)); // removes metadata which are not a sentence

        // print("ARRAY OF ENCODED SENTENCES\n");
        // print_r($sentences);

        // extract tokens and lemmata from each sentence
        foreach ($sentences as $sentence) {

            // remove irrelevant signs and convert each sentence into an array of still encoded tokens
            $sentence = str_replace('\n#', '', $sentence);
            $numTokens = substr_count($sentence, '\n');

            for ($i = 1; $i < $numTokens; $i++) {
                $sentence = str_replace('\n' . $i, '\nTOKEN', $sentence);
            }

            $sentence = explode('\nTOKEN', $sentence);
            $sentence = array_values(array_slice($sentence, 1));

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
                        if (substr($token, 0, 1) === (string) $j) {
                            $sentence[$k] = substr($token, 1);
                        }
                        if (str_starts_with($token, "-")) { // these are the ,complex tokens‘ to be removed
                            unset($sentence[$k]);
                        }
                    }
                }
            }

            // update the array indices
            $sentence = array_values($sentence);

            // print("SENTENCE AS ARRAY OF ENCODED TOKENS WITHOUT INTEGERS AND UNLEMMATIZED DUPLICATES\n");
            // print_r($sentence);

            // extract words and lemmata out of the normalized encoded tokens
            foreach ($sentence as $encToken) {
                $token = explode('\t', $encToken);
                //print("DECODED TOKEN\n");
                //print_r($decToken);
                $words_and_lemmata[0][] = $token[1];
                $words_and_lemmata[1][] = $token[2];
            }
        }

        // signal missing words or lemmata in the returned data
        foreach ($words_and_lemmata[0] as $word) {
            if ($word === null or $word === '') {
                print("EMPTY WORD IN LIST OF WORDS!\n");
            }
        }

        foreach ($words_and_lemmata[1] as $lemma) {
            if ($lemma === null or $lemma === '') {
                print("EMPTY LEMMA IN LIST OF LEMMATA!\n");
            }
        }

        // print_r($words_and_lemmata);
        return $words_and_lemmata;
    }

}