<?php

namespace APM\System;

use RuntimeException;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\ItemNotInCacheException;

/**
 * Description of Lemmatizer
 *
 * Lemmatizes a clean text via an api call to udpipe 2 in arabic, hebrew or latin.
 *
 * @author Lukas Reichert
 */

class Lemmatizer
{

    const string CACHE_PREFIX = 'Lemmatizer';

    /**
     * Returns an array of tokens and lemmata for a given text in a given language.
     * @param string $lang
     * @param string $text_clean
     * @param DataCache|null $dataCache
     * @return array|array[]
     */
    static public function runLemmatizer(string $lang, string $text_clean, ?DataCache $dataCache = null): array {

        // get language code for api call to udpipe2
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
            case 'jrb':
                $lang = 'hebrew';
        }
        $data = null;
        $hash = hash('sha512', $text_clean);
        $key = implode(':', [ self::CACHE_PREFIX, $hash ]);
        if ($dataCache !== null) {
            try {
                $data = unserialize($dataCache->get($key));
            } catch (ItemNotInCacheException $e) {
                // just keep going
            }
        }

        if ($data === null) {
            $tempDir = '/tmp';
            $inputFileName =  "$tempDir/lemmatizer-$hash-in.txt";
            if (!file_put_contents($inputFileName, $text_clean)) {
                throw new RuntimeException("Cannot write temp file for lemmatization");
            };
            exec("curl -s -F data=@$inputFileName -F model=$lang -F tokenizer= -F tagger= https://lindat.mff.cuni.cz/services/udpipe/api/process", $data);
            $dataCache?->set($key, serialize($data));
        }

//
//        $resultFileName = "$tempDir/lemmatizer-$hash-out.txt";
//
//
//        $data = null;
//        if (file_exists($resultFileName)) {
//            $fileContents = file_get_contents($resultFileName);
//            if ($fileContents !== false) {
//                $data = unserialize($fileContents);
//            }
//        }
//
//        if ($data === null) {
//            if (!file_put_contents($inputFileName, $text_clean)) {
//                throw new \RuntimeException("Cannot write temp file for lemmatization");
//            };
//            // make api call
//            exec("curl -s -F data=@$inputFileName -F model=$lang -F tokenizer= -F tagger= https://lindat.mff.cuni.cz/services/udpipe/api/process", $data);
//            // remove temp file after lemmatization
//            unlink($inputFileName);
//            file_put_contents($resultFileName, serialize($data));
//        }

        // return tokens and lemmata
        return self::getTokensAndLemmata($data[6]);
    }

    /**
     * Extracts the tokens and its lemmata from the api response, which is plain text that contains a lot more information than needed here.
     * @param string|null $data
     * @return array|array[]
     */
    static private function getTokensAndLemmata (string $data=null): array {

        // array of arrays to be returned
        $tokens_and_lemmata = ['tokens' => [], 'lemmata' => []];

        // split plain text data from the udpipe api into encoded sentences
        $sentences = explode(' text ', $data);
        $sentences = array_values(array_slice($sentences, 1)); // removes metadata which are not a sentence

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
            //print_r($sentence);

            $complexTokenPositions = [];
            $numComplexTokens = 0;

            // get start and end indices of complex tokens
            foreach ($sentence as $k => $token) {
                if (str_contains(substr($token, 0, 4), '-')) {
                    $token = explode('-', $token);
                    //print_r($token);
                    $start = (int)$token[0] + $numComplexTokens;
                    if (is_numeric($token[1][0])) {
                        $end = (int) explode('\t', $token[1])[0] + $numComplexTokens;
                        $complexTokenPositions[] = [$start, $end];
                        $numComplexTokens++;
                    }
                }
            }

            // normalize the tokens
            // drop integers at the beginning of every encoded tokens and drop the token duplicates which are not lemmatized
            // (it seems like the api lemmatizer returns articles of nouns and the nouns twice (each as a single token with lemmatization
            // and as complex token without lemmatization, these are removed)
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
            }

            //print("SENTENCE COUNT: " . count($sentence) .  "\n");
            //if (count($sentence) === 58) {
            //print_r($sentence);
            //print_r($complexTokenPositions);
            //}


            // normalize complex tokens with blanks
            foreach ($complexTokenPositions as $positions) {
                for ($n = $positions[0]; $n <= $positions[1]; $n++) {
                    if ($n === $positions[0]) {
                        $sentence[$positions[0]-1][2] = " " . $sentence[$n][2] . " ";
                    } else {
                        //print($n . "\n");
                        $sentence[$positions[0]-1][2] = $sentence[$positions[0]-1][2] . " " . $sentence[$n][2] . " ";
                    }
                    unset($sentence[$n]);
                }
            }

            $sentence = array_values($sentence);

            foreach ($sentence as $tokenAsList) {
                $tokens_and_lemmata['tokens'][] = $tokenAsList[1];
                $tokens_and_lemmata['lemmata'][] = $tokenAsList[2];
            }
        }

        // signal missing words or lemmata in the returned data
//        foreach ($tokens_and_lemmata['tokens'] as $word) {
//            if ($word === null or $word === '') {
//                print("EMPTY WORD IN LIST OF WORDS!\n");
//            }
//        }

        // in some rare cases, there seems to be no lemma returned from the api, then: use the word itself as the lemma
        /** @var string $key */
        foreach ($tokens_and_lemmata['lemmata'] as $key => $lemma) {
            if ($lemma === null or $lemma === '') {
                $tokens_and_lemmata['lemmata'][$key] =  $tokens_and_lemmata['tokens'][$key];
            }
        }

        return $tokens_and_lemmata;
    }

    /**
     * Returns a random string.
     * @param int $length
     * @return string
     * @throws \Exception
     */
    private static function generateRandomString(int $length=10): string {
        $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $charactersLength = strlen($characters);
        $randomString = '';

        for ($i = 0; $i < $length; $i++) {
            $randomString .= $characters[random_int(0, $charactersLength - 1)];
        }

        return $randomString;
    }

}