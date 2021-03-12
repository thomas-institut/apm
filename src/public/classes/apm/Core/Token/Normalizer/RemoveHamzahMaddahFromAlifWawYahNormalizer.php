<?php


namespace APM\Core\Token\Normalizer;

use IntlChar;

/**
 * Changes alif, waw and yah with hamza and madda into a simple alif, waw and yah
 * @package APM\Core\Token\Normalizer
 */
class RemoveHamzahMaddahFromAlifWawYahNormalizer extends SimpleStringNormalizer
{

    private array $complexAlifs;
    private ?string $simpleAlif;
    private array $complexWaws;
    private ?string $simpleWaw;
    private array $complexYahs;
    private ?string $simpleYah;

    public function __construct()
    {
        $this->complexAlifs = [
            IntlChar::chr(0x622), // Alif with maddah above
            IntlChar::chr(0x623), // Alif with hamzah above
            IntlChar::chr(0x625) // Alif with hamzah below
        ];

        $this->simpleAlif = IntlChar::chr(0x627);

        $this->complexWaws = [
            IntlChar::chr(0x624) // waw with hamza above
        ];

        $this->simpleWaw = IntlChar::chr(0x648);

        $this->complexYahs = [
            IntlChar::chr(0x626) // yah with hamza above
        ];

        $this->simpleYah = IntlChar::chr(0x64A);
    }

    /**
     * @inheritDoc
     */
    public function normalizeString(string $str): string
    {
        $withoutAlifs = str_replace( $this->complexAlifs, $this->simpleAlif, $str);
        $withoutWaws = str_replace( $this->complexWaws, $this->simpleWaw, $withoutAlifs);
        return str_replace( $this->complexYahs, $this->simpleYah, $withoutWaws);
    }
}