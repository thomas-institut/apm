<?php
require_once __DIR__ . '/apps/apm/www/classes/APM/CommandLine/CommandLineUtility.php';
require_once __DIR__ . '/apps/apm/www/classes/APM/CommandLine/ApmCtlUtility/AdminUtility.php';
require_once __DIR__ . '/apps/apm/www/classes/APM/CommandLine/ApmCtlUtility/PublicationTool.php';

use APM\CommandLine\ApmCtlUtility\PublicationTool;

$tool = new class extends PublicationTool {
    public function __construct() {}
    public function testGenerateTEI($title, $mainText, $apparatuses, $witnesses) {
        $method = new ReflectionMethod(PublicationTool::class, 'generateTEI');
        $method->setAccessible(true);
        return $method->invoke($this, $title, $mainText, $apparatuses, $witnesses);
    }
};

$mainText = [
    (object)['type' => 'text', 'text' => [(object)['text' => '1. ']], 'style' => ''],
    (object)['type' => 'text', 'text' => [(object)['text' => 'Quia']], 'style' => ''],
    (object)['type' => 'glue', 'text' => [(object)['type' => 'glue']], 'style' => ''],
    (object)['type' => 'text', 'text' => [(object)['text' => 'natura']], 'style' => ''],
    (object)['type' => 'paragraph_end', 'text' => [], 'style' => 'normal']
];

$apparatuses = [
    (object)[
        'type' => 'criticus',
        'entries' => [
            (object)[
                'from' => 1,
                'to' => 1,
                'subEntries' => [
                    (object)[
                        'text' => [(object)['text' => 'Quoniam']],
                        'witnessData' => [(object)['siglum' => 'Oc', 'witnessIndex' => 0]]
                    ]
                ]
            ]
        ]
    ]
];

$witnesses = [
    (object)['siglum' => 'Oc', 'title' => 'Oxford, Balliol College Library, 106']
];

echo $tool->testGenerateTEI('Test Format', $mainText, $apparatuses, $witnesses);
