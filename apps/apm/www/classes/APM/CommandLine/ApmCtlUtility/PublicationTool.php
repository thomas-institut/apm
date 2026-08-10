<?php

namespace APM\CommandLine\ApmCtlUtility;

use APM\Actions\GetTranscriptionDataForDocument;
use APM\CommandLine\CommandLineUtility;
use APM\System\PublicationManager\PublicationManagerInterface;
use APM\System\PublicationManager\PublicationNotFoundException;
use APM\System\PublicationManager\ResourceNotFoundException;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use RuntimeException;
use ThomasInstitut\ApmPublicationApi\PublicationType;
use ThomasInstitut\ApmPublicationApi\TranscriptionData;
use JsonException;

class PublicationTool extends CommandLineUtility implements AdminUtility
{
    const string CMD = 'pub';

    const string DESCRIPTION = "Publication management functions";

    public function getCommand(): string
    {
        return self::CMD;
    }

    public function getHelp(): string
    {
       $options = [
           'list' => 'prints current publications',
           'add <type> <id> [version]' => 'adds a publication of type <type> for resource id <id> (version is a timestring and is optional, defaults to the current version)',
           'update <id> [version]' => 'updates a publication by id (version is a timestring and is optional, defaults to the current version)',
           'del <id>' => 'removes a publication by id',
           'show <id>' => 'shows a publication by id',
           'export <type> <id>' => 'exports a publication by id as JSON file',
           'tei <id>' => 'converts a publication JSON to TEI format'
            ];
        return implode("\n", array_map(function($key, $value) { return "  $key: $value"; }, array_keys($options), $options));
    }

    public function getDescription(): string
    {
        return self::DESCRIPTION;
    }

    public function main($argc, $argv): int
    {

        if ($argc === 1) {
            print "Usage:\n" . $this->getHelp() . "\n";
            return 0;
        }

        $option = $argv[1] ?? '';

        return match ($option) {
            'list' => $this->list(),
            'add' => $this->add($argv[2], (int)$argv[3], $argv[4] ?? 'current'),
            'update' => $this->update((int)$argv[2], $argv[3] ?? 'current'),
            'del' => $this->remove((int)$argv[2]),
            'show' => $this->show((int)$argv[2]),
            'export' => $this->export((int)$argv[2]),
            'tei' => $this->convertJsonToTei((int)$argv[2]),
            default => 0,
        };
    }

    private function add(string $type, int $resourceId, string $version) : int {
        if ($resourceId <= 0) {
            print "Error: resource id must be greater than 0\n";
            return 1;
        }
        if ($type === 'tx' || $type === 'tx-full' ) {
            $type = PublicationType::Transcription->value;
        }
        if ($type === 'ed' || $type === 'edition') {
            $type = PublicationType::Edition->value;
        }

        if ($type !== PublicationType::Transcription->value && $type !== PublicationType::Edition->value) {
            print "Sorry, only transcription and edition publications are supported at this time\n";
            return 1;
        }
        try {
            /** @var PublicationManagerInterface $pm */
            $pm = $this->container->get(PublicationManagerInterface::class);
            $data = $pm->createPublication($type, $resourceId, $version);
            print "Publication $data->id created\n";
            return 0;
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface) {
            print "Error initializing system\n";
            return 1;
        } catch (ResourceNotFoundException $e) {
            print "Error: resource not found" . $e->getMessage() . "\n";
            return 1;
        }
    }

    private function update(int $pubId, string $version) : int {
        if ($pubId <= 0) {
            print "Error: publication id must be greater than 0\n";
        }
        try {
            /** @var PublicationManagerInterface $pm */
            $pm = $this->container->get(PublicationManagerInterface::class);
            $pm->updatePublication($pubId, $version);
            print "Publication $pubId updated\n";
            return 0;
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface) {
            print "Error initializing system\n";
            return 1;
        } catch (PublicationNotFoundException) {
            print "Error: publication not found\n";
            return 1;
        } catch (ResourceNotFoundException $e) {
            print "Error: publication's resource data not found\n";
            return 1;
        }
    }


    private function list() : int {
        try {
            /** @var PublicationManagerInterface $pm */
            $pm = $this->container->get(PublicationManagerInterface::class);
            $listings = $pm->list();
            if (count($listings) === 0) {
                print "No publications found\n";
                return 0;
            }
            print "Current Publications\n";
            foreach ($listings as $listing) {
                print " - $listing->id  {$listing->type->value}  $listing->title $listing->versionTimeString\n";
            }
            return 0;
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface) {
            print "Error initializing system\n";
            return 1;
        }
    }

    private function remove(int $pubId) : int {
        if ($pubId <= 0) {
            print "Error: publication id must be greater than 0\n";
            return 1;
        }
        try {
            /** @var PublicationManagerInterface $pm */
            $pm = $this->container->get(PublicationManagerInterface::class);
            $pm->deletePublication($pubId);
            return 0;
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface) {
            print "Error initializing system\n";
            return 1;
        } catch (PublicationNotFoundException) {
            print "Error: publication not found\n";
            return 1;
        }
    }

    private function show(int $pubId) : int {
        if ($pubId <= 0) {
            print "Error: publication id must be greater than 0\n";
            return 1;
        }
        try {
            /** @var PublicationManagerInterface $pm */
            $pm = $this->container->get(PublicationManagerInterface::class);
            $data = $pm->getPublication($pubId);
            if ($data->type === PublicationType::Transcription) {
                /** @var TranscriptionData $data */
                $this->printTranscriptionData($data);
            } elseif ($data->type === PublicationType::Edition) {
                print "Publication $pubId is an Edition publication. Content display is not yet supported in CLI.\n";
            } else {
                print "Publication $pubId is of type '{$data->type->value}': Not supported for display\n";
                return 1;
            }
            return 0;
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface) {
            print "Error initializing system\n";
            return 1;
        } catch (PublicationNotFoundException) {
            print "Error: publication not found\n";
            return 1;
        }
    }


    private function export(int $pubId) : int {
        if ($pubId <= 0) {
            print "Error: publication id must be greater than 0\n";
            return 1;
        }

        try {
            /** @var PublicationManagerInterface $pm */
            $pm = $this->container->get(PublicationManagerInterface::class);
            $data = $pm->getPublication($pubId);

            $json = json_encode(
                    $data,
                    JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
                ) . "\n";

            $fileName = sprintf('%s.json', $pubId);

            if (@file_put_contents($fileName, $json . "\n") === false) {
                print "Error: could not write publication JSON to file '$fileName'\n";
                return 1;
            }

            print "Publication $pubId exported to '$fileName'\n";
            return 0;

        } catch (NotFoundExceptionInterface|ContainerExceptionInterface) {
            print "Error initializing system\n";
            return 1;
        } catch (PublicationNotFoundException) {
            print "Error: publication not found\n";
            return 1;
        } catch (JsonException $e) {
            print "Error: could not encode publication as JSON: " . $e->getMessage() . "\n";
            return 1;
        }
    }

    private function printTranscriptionData(TranscriptionData $data) : void {
        $linesToPrint = [];
        $linesToPrint[] =  sprintf("Document %d: %s", $data->id, $data->title);
        $linesToPrint[] = sprintf("(%s, %d pages)", $data->languageCode, count($data->pages));
        $linesToPrint[] = " ";
        foreach ($data->pages as $page) {
            $linesToPrint[] = sprintf("Page %d", $page->pageNumber);
            $linesToPrint[] = " ";
            $linesToPrint[] = sprintf("  %-10s  %s", "Text page", $page->isTextPage ? "Yes" : "No");
            $linesToPrint[] = sprintf("  %-10s  '%s'", "Foliation", $page->foliation);
            $linesToPrint[] = sprintf("  %-10s  '%s'", "Image", $page->imageUrl);
            $linesToPrint[] = sprintf("  %-10s  '%s'", "Thumbnail", $page->thumbnailUrl);
            $linesToPrint[] = " ";
            if (count($page->columns) === 0) {
                $linesToPrint[] = "  No transcription\n";
            }
            foreach ($page->columns as $colIndex => $column) {
                $linesToPrint[] = sprintf("  Column %d", $colIndex + 1);
                $linesToPrint[] = " ";
                $txLines = explode("\n", $column->transcriptionText);
                foreach ($txLines as $lineIndex => $txLine) {
                    $linesToPrint[] = sprintf("    %2d: %s", $lineIndex + 1, $txLine);
                }
            }
            $linesToPrint[] = " ";
        }
        print implode("\n", $linesToPrint);
    }

    private function convertJsonToTei (int $pubId): int
    {
        if ($pubId <= 0) {
            print "Error: publication id must be greater than 0\n";
            return 1;
        }

        try {
            $jsonFileName = sprintf('%s.json', $pubId);

            if (!file_exists($jsonFileName)) {
                print "Error: Export file '$jsonFileName' not found. Please run 'pub export $pubId' first.\n";
                return 1;
            }

            $jsonContent = file_get_contents($jsonFileName);
            $publication = json_decode($jsonContent, false, 512, JSON_THROW_ON_ERROR);

            // The publication object is now available as a stdClass object with accessible attributes
            // Example: $publication->id, $publication->title, etc.

            $fileName = sprintf('%s.xml', $pubId);

            print "Publication $pubId loaded from '$jsonFileName'. Ready for TEI conversion to '$fileName'.\n";

            $xmlCode = $this->generateTEI($publication->title, $publication->mainText, $publication->apparatuses, $publication->witnesses,
                $publication->languageCode, $publication->description, $publication->versionTimeString, $publication->siglaGroups);

            file_put_contents($fileName, $xmlCode);

            return 0;

        } catch (JsonException $e) {
            print "Error: Could not decode JSON from '$jsonFileName': " . $e->getMessage() . "\n";
            return 1;
        } catch (PublicationNotFoundException) {
            print "Error: publication not found\n";
            return 1;
        } catch (\Exception $e) {
            print "Error: " . $e->getMessage() . "\n";
            return 1;
        }
    }

    private function generateTEI(string $title, array $mainText, array $apparatuses, array $witnesses,  string $lang="", string $desc="", string $date="", array $siglas=[]): string {

        $witnessesFormatted = "";

        foreach ($witnesses as $witness) {
            $witnessesFormatted = $witnessesFormatted . "\n<witness xml:id=\"$witness->siglum\">$witness->title</witness>";
        }

        $siglaMap = [];
        foreach ($witnesses as $index => $witness) {
            $siglaMap[$index] = $witness->siglum;
        }

        $appsByStart = [];
        $appsByEnd = [];
        foreach ($apparatuses as $apparatus) {
            $type = is_object($apparatus->type) ? $apparatus->type->value : $apparatus->type;
            foreach ($apparatus->entries as $entry) {
                $entry->appType = $type;
                $appsByStart[$entry->from][] = $entry;
                $appsByEnd[$entry->to][] = $entry;
            }
        }

        $body = "";
        $isParagraphOpen = false;

        foreach ($mainText as $index => $token) {
            // Check if we need to open a paragraph
            if (!$isParagraphOpen && $token->type !== 'paragraph_end') {
                $style = 'normal';
                for ($i = $index; $i < count($mainText); $i++) {
                    if ($mainText[$i]->type === 'paragraph_end') {
                        $style = $mainText[$i]->style;
                        break;
                    }
                }
                $tag = ($style === 'h2') ? 'head' : 'p';
                $body .= "<$tag>";
                $isParagraphOpen = true;
            }

            // Start apparatus entries
            if (isset($appsByStart[$index])) {
                // Sort by end index descending to ensure outermost entries are started first
                usort($appsByStart[$index], function ($a, $b) {
                    return $b->to <=> $a->to;
                });
                foreach ($appsByStart[$index] as $entry) {
                    $body .= sprintf('<app type="%s"><lem>', htmlspecialchars($entry->appType));
                }
            }

            // Process token content
            if ($token->type === 'text') {
                $body .= $this->fmtTextToString($token->text);
            } elseif ($token->type === 'glue') {
                $body .= ' ';
            }

            // End apparatus entries
            if (isset($appsByEnd[$index])) {
                // Sort by start index descending to ensure innermost entries are closed first
                usort($appsByEnd[$index], function ($a, $b) {
                    return $b->from <=> $a->from;
                });
                foreach ($appsByEnd[$index] as $entry) {
                    $body .= "</lem>";
                    foreach ($entry->subEntries as $subEntry) {
                        $wits = [];
                        foreach ($subEntry->witnessData as $wd) {
                            $siglum = $wd->siglum ?: ($siglaMap[$wd->witnessIndex] ?? '');
                            if ($siglum) {
                                $wits[] = '#' . $siglum;
                            }
                        }
                        $witStr = implode(' ', $wits);
                        $rdgText = $this->fmtTextToString($subEntry->text);
                        $body .= sprintf('<rdg wit="%s">%s</rdg>', htmlspecialchars($witStr), $rdgText);
                    }
                    $body .= "</app>";
                }
            }

            // End paragraph
            if ($token->type === 'paragraph_end') {
                if ($isParagraphOpen) {
                    $tag = ($token->style === 'h2') ? 'head' : 'p';
                    $body .= "</$tag>\n";
                    $isParagraphOpen = false;
                }
            }
        }


        $teiOpening = <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<?xml-model href="http://www.tei-c.org/release/xml/tei/custom/schema/relaxng/tei_all.rng" schematypens="http://relaxng.org/ns/structure/1.0"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
    <teiHeader>
        <fileDesc>
            <titleStmt>
                <title> $title </title>
                <author>Unknown</author>
                <respStmt>
                    <resp>Text Encoding by </resp>
                    <name>APM</name>
                </respStmt>
            </titleStmt>
            <publicationStmt>
                <publisher>APM</publisher>
                <availability>
                    <p>This document is being made available for demonstration and testing purposes
                        only.</p>
                </availability>
            </publicationStmt>
            <sourceDesc>
                <p>The base text is a JSON encoded edition exported from the APM.</p>
                <p/>
            </sourceDesc>
        </fileDesc>
        <encodingDesc>
            <variantEncoding method="parallel-segmentation" location="internal"/>
        </encodingDesc>
    </teiHeader>
    <text>
        <front>
            <div>
                <listWit>
                    $witnessesFormatted
                </listWit>
            </div>
        </front>
        <body>
XML;

        $teiEnd = "</body></text></TEI>";

        return $teiOpening . $body . $teiEnd;

    }

    private function fmtTextToString(string|array $text): string
    {
        if (is_string($text)) {
            return htmlspecialchars($text);
        }
        $out = "";
        foreach ($text as $part) {
            if (isset($part->text)) {
                $out .= htmlspecialchars($part->text);
            } elseif (isset($part->type) && $part->type === 'glue') {
                $out .= ' ';
            }
        }
        return $out;
    }

}