<?php

namespace APM\System\Lemmatizer;


use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use InvalidArgumentException;
use RuntimeException;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataCache\NullDataCache;

class UdPipeLemmatizer implements LemmatizerInterface
{

    const string DefaultUdPipeApiUrl = 'https://lindat.mff.cuni.cz/services/udpipe/api/process';
    private DataCache $dataCache;
    private string $udPipeApiUrl;



    public function __construct(?DataCache $cache = null, string $udPipeApiUrl = self::DefaultUdPipeApiUrl)
    {
        if ($cache === null) {
            $this->dataCache = new NullDataCache();
        } else {
            $this->dataCache = $cache;
        }
        $this->udPipeApiUrl = $udPipeApiUrl;
    }

    private function getCacheKey(string $text, string $langCode) : string {
        $hash = hash('sha256', $text);
        return "UdPipeLemmatizer-$langCode-$hash";
    }

    /**
     * @inheritDoc
     */
    public function lemmatize(string $text, string $langCode): array
    {
        $cacheKey = $this->getCacheKey($text, $langCode);
        try {
            return unserialize($this->dataCache->get($cacheKey));
        } catch (KeyNotInCacheException) {
        }

        $lang = match ($langCode) {
            'la' => 'latin',
            'ar' => 'arabic',
            'he', 'jrb' => 'hebrew',
            default => null, // Optional: handle cases where $langCode doesn't match any case
        };

        if ($lang === null) {
            throw new InvalidArgumentException("Language $langCode is not a valid language code.");
        }

        $text = preg_replace('/\s+/', '', $text);

        $guzzleClient = new Client();

        try {
            $response = $guzzleClient->request('POST', $this->udPipeApiUrl, [
                'form_params' => [
                    'data' => $text,
                    'model' => $lang,
                    'tokenizer' => '',
                    'tagger' => ''
                ]
            ]);
        } catch (GuzzleException $e) {
            throw new RuntimeException("Error getting response from UdPipe API: " . $e->getMessage());
        }

        $data = $response->getBody()->getContents();
        $result = $this->getTokensAndLemmata($data);
        $this->dataCache->set($cacheKey, serialize($result));
        return $result;
    }


    private function getTokensAndLemmata(string $data): array {

        // Array of arrays to be returned
        $tokensAndLemmata = ['tokens' => [], 'lemmata' => []];

        // Split plain text data from the udpipe API into encoded sentences
        $sentences = explode(' text ', $data);
        $sentences = array_values(array_slice($sentences, 1)); // Removes metadata which are not a sentence

        // Extract tokens and lemmata from each sentence
        foreach ($sentences as $sentence) {

            // Remove irrelevant signs and convert each sentence into an array of still encoded tokens
            $sentence = str_replace('\n#', '', $sentence);

            $sentence = explode("\n", $sentence);

            foreach ($sentence as $key => $token) {
                if (!str_contains($token, '\t')) {
                    unset($sentence[$key]);
                }
            }

            $sentence = array_values($sentence);

            $complexTokenPositions = [];
            $numComplexTokens = 0;

            // Get start and end indices of complex tokens
            foreach ($sentence as $token) {
                if (str_contains(substr($token, 0, 4), '-')) {
                    $token = explode('-', $token);
                    $start = (int)$token[0] + $numComplexTokens;
                    if (is_numeric($token[1][0])) {
                        $end = (int)explode('\t', $token[1])[0] + $numComplexTokens;
                        $complexTokenPositions[] = [$start, $end];
                        $numComplexTokens++;
                    }
                }
            }

            // Normalize the tokens
            for ($i = 0; $i < 5; $i++) {
                for ($j = 0; $j < 10; $j++) {
                    foreach ($sentence as $key => $token) {
                        if (substr($token, 0, 1) === (string)$j || str_starts_with($token, '-')) {
                            $sentence[$key] = substr($token, 1);
                        }
                    }
                }
            }

            // Update the array indices
            $sentence = array_values($sentence);

            // Extract words and lemmata out of the normalized encoded tokens
            foreach ($sentence as $index => $encodedToken) {
                $decodedToken = explode('\t', $encodedToken);

                // Clean tokens and lemmata from underscores
                foreach ($decodedToken as $key => $element) {
                    if (str_contains($element, '_')) {
                        $decodedToken[$key] = str_replace('_', '', $element);
                    }
                }

                $sentence[$index] = $decodedToken;
            }

            // Normalize complex tokens with blanks
            foreach ($complexTokenPositions as $positions) {
                for ($n = $positions[0]; $n <= $positions[1]; $n++) {
                    if ($n === $positions[0]) {
                        $sentence[$positions[0] - 1][2] = " " . $sentence[$n][2] . " ";
                    } else {
                        $sentence[$positions[0] - 1][2] .= " " . $sentence[$n][2] . " ";
                    }
                    unset($sentence[$n]);
                }
            }

            $sentence = array_values($sentence);

            foreach ($sentence as $tokenAsList) {
                $tokensAndLemmata['tokens'][] = $tokenAsList[1];
                $tokensAndLemmata['lemmata'][] = $tokenAsList[2];
            }
        }

        // In some rare cases, there seems to be no lemma returned from the API, then use the word itself as the lemma
        // TODO: check this: why is setting $key as string necessary?
        /** @var string $key */
        foreach ($tokensAndLemmata['lemmata'] as $key => $lemma) {
            if ($lemma === null || $lemma === '') {
                $tokensAndLemmata['lemmata'][$key] = $tokensAndLemmata['tokens'][$key];
            }
        }

        return $tokensAndLemmata;
    }
}