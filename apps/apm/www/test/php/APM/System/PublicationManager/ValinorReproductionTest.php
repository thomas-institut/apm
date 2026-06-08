<?php

namespace APM\System\PublicationManager;

use PHPUnit\Framework\TestCase;
use ThomasInstitut\ApmPublicationApi\EditionPublication\ApparatusSubEntry;
use ThomasInstitut\ApmPublicationApi\EditionPublication\SubEntryType;
use ThomasInstitut\FmtText\FmtTextToken;
use ThomasInstitut\FmtText\FmtTextTextToken;
use ThomasInstitut\FmtText\FmtTextMarkToken;
use ThomasInstitut\FmtText\FmtTextGlueToken;
use ThomasInstitut\FmtText\FmtTextEmptyToken;
use CuyZ\Valinor\MapperBuilder;
use CuyZ\Valinor\Mapper\MappingError;

class ValinorReproductionTest extends TestCase
{
    public function testMappingStringInUnionWithInferFixed(): void
    {
        $data = [
            'type' => 'variant',
            'text' => 'some string',
            'witnessData' => [],
            'keyword' => 'kw',
            'position' => 1
        ];

        try {
            $result = (new MapperBuilder())
                ->allowSuperfluousKeys()
                ->allowPermissiveTypes()
                // Do NOT use infer for FmtTextToken here.
                // Instead, use a custom constructor or mapping for the specific properties if needed.
                ->mapper()
                ->map(ApparatusSubEntry::class, $data);
            
            $this->assertEquals('some string', $result->text);
        } catch (\Throwable $e) {
             echo get_class($e) . ": " . $e->getMessage() . "\n";
             throw $e;
        }
    }
}
