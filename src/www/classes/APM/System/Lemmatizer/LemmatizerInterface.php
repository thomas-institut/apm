<?php

namespace APM\System\Lemmatizer;

interface LemmatizerInterface
{

    /**
     * Takes a text consisting of a number of words separated by whitespace and returns an array with
     * word tokens and their non-declined, non-conjugated versions (their lemmata)
     * according to the given language.
     *
     * For example, the text `'Dicit Aristoteles'` in Latin produces the following
     * output array:
     *
     *  ```
     *  [
     *      'tokens' => [ 'Dicit', 'Aristoteles'],
     *      'lemmata' => [ 'dico', 'aristoteles']
     *  ]
     * ```
     * @param string $text
     * @param string $langCode
     * @return array
     */
    public function lemmatize(string $text, string $langCode) : array;
}