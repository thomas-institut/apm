<?php

namespace APM\System\Factories;

use APM\Core\Token\Normalizer\IgnoreArabicVocalizationNormalizer;
use APM\Core\Token\Normalizer\IgnoreIsolatedHamzaNormalizer;
use APM\Core\Token\Normalizer\IgnoreShaddaNormalizer;
use APM\Core\Token\Normalizer\IgnoreTatwilNormalizer;
use APM\Core\Token\Normalizer\RemoveHamzahMaddahFromAlifWawYahNormalizer;
use APM\Core\Token\Normalizer\ToLowerCaseNormalizer;
use APM\System\ApmNormalizerManager;
use APM\System\NormalizerManager;

class NormalizerManagerFactory
{

    public static function create() : NormalizerManager
    {
        $normalizerManager = new ApmNormalizerManager();
        // Add standard normalizers
        $normalizerManager->registerNormalizer('la', 'standard',
            'toLowerCase', new ToLowerCaseNormalizer());
        $normalizerManager->setNormalizerMetadata('toLowerCase', [
            'automaticCollation' => [
                'label' => 'Ignore Letter Case',
                'help' => "E.g., 'Et' and 'et' will be taken to be the same word"
            ]
        ]);

        $normalizerManager->registerNormalizer('ar', 'standard',
            'removeHamzahMaddahFromAlifWawYah', new RemoveHamzahMaddahFromAlifWawYahNormalizer());
        $normalizerManager->setNormalizerMetadata('removeHamzahMaddahFromAlifWawYah', [
            'automaticCollation' => [
                'label' => 'Ignore hamzah and maddah in ʾalif, wāw and yāʾ',
                'help' => "آ , أ, إ &larr; ا      ؤ &larr; و      ئ &larr; ي"
            ]
        ]);

        $normalizerManager->registerNormalizer('ar', 'standard',
            'ignoreVocalization', new IgnoreArabicVocalizationNormalizer());
        $normalizerManager->setNormalizerMetadata('ignoreVocalization', [
            'automaticCollation' => [
                'label' => 'Ignore Vocalization',
                'help' => "Ignore vocal diacritics, e.g., الْحُرُوف &larr; الحروف"
            ]
        ]);

        $normalizerManager->registerNormalizer('ar', 'standard',
            'ignoreShadda', new IgnoreShaddaNormalizer());
        $normalizerManager->setNormalizerMetadata('ignoreShadda', [
            'automaticCollation' => [
                'label' => 'Ignore Shaddah',
                'help' => "Ignore shaddah, e.g., درّس &larr; درس"
            ]
        ]);

        $normalizerManager->registerNormalizer('ar', 'standard',
            'ignoreTatwil', new IgnoreTatwilNormalizer());
        $normalizerManager->setNormalizerMetadata('ignoreTatwil', [
            'automaticCollation' => [
                'label' => 'Ignore taṭwīl',
                'help' => "Ignore taṭwīl"
            ]
        ]);

        $normalizerManager->registerNormalizer('ar', 'standard',
            'ignoreIsolatedHamza', new IgnoreIsolatedHamzaNormalizer());
        $normalizerManager->setNormalizerMetadata('ignoreIsolatedHamza', [
            'automaticCollation' => [
                'label' => 'Ignore isolated hamza',
                'help' => "Ignore hamza"
            ]
        ]);

        return $normalizerManager;
    }
}