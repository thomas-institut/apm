<?php

namespace APM\CommandLine\ApmCtl;

use APM\CommandLine\MultiToolCli\MultiToolCliUtility;
use APM\System\PublicationManager\PublicationManager;
use APM\System\PublicationManager\PublicationNotFoundException;
use APM\System\PublicationManager\ResourceNotFoundException;
use APM\TEI\EvtTeiGenerator;
use Exception;
use ThomasInstitut\ApmPublicationApi\PublicationType;
use ThomasInstitut\ApmPublicationApi\TranscriptionData;

class PublicationTool implements MultiToolCliUtility
{
    const string CMD = 'pub';

    const string DESCRIPTION = "Publication management functions";


    public function __construct(
        private readonly PublicationManager $publicationManager
    )
    {
    }

    public static function getName(): string
    {
        return self::CMD;
    }

    public static function getUsage(): string
    {
        $options = [
            'list <publisherId>' => 'prints publications available to a publisher',
            'add <type> <id> <publisherIds> [version]' => 'adds a publication for comma-separated publisher IDs (version is optional)',
            'update <id> [version]' => 'updates a publication by id (version is a timestring and is optional, defaults to the current version)',
            'del <id>' => 'removes a publication by id',
            'show <publisherId> <id>' => 'shows a publication available to a publisher',
            'export json|evt <publisherId> <id>' => 'exports a publication available to a publisher as JSON or EVT-compatible TEI-XML (only for editions)',
        ];
        return implode("\n", array_map(function ($key, $value) {
            return "  $key: $value";
        }, array_keys($options), $options));
    }

    public static function getDescription(): string
    {
        return self::DESCRIPTION;
    }

    public function run(int $argc, array $argv): int
    {

        if ($argc === 1) {
            print "Usage:\n" . $this->getUsage() . "\n";
            return 0;
        }

        $option = $argv[1] ?? '';

        return match ($option) {
            'list' => $this->list((int)$argv[2]),
            'add' => $this->add($argv[2], (int)$argv[3], $this->parsePublisherIds($argv[4]), $argv[5] ?? 'current'),
            'update' => $this->update((int)$argv[2], $argv[3] ?? 'current'),
            'del' => $this->remove((int)$argv[2]),
            'show' => $this->show((int)$argv[2], (int)$argv[3]),
            'export' => $this->export($argv[2], (int)$argv[3], (int)$argv[4]),
            default => 0,
        };
    }

    private function add(string $type, int $resourceId, array $publisherIds, string $version): int
    {
        if ($resourceId <= 0) {
            print "Error: resource id must be greater than 0\n";
            return 1;
        }
        if ($type === 'tx' || $type === 'tx-full') {
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
            $pm = $this->publicationManager;
            $data = $pm->createPublication($type, $resourceId, $publisherIds, $version);
            print "Publication $data->id created\n";
            return 0;
        } catch (ResourceNotFoundException $e) {
            print "Error: resource not found" . $e->getMessage() . "\n";
            return 1;
        } catch (\InvalidArgumentException $e) {
            print "Error: " . $e->getMessage() . "\n";
            return 1;
        }
    }

    /**
     * Parses a comma-separated list of publisher IDs.
     *
     * @param string $publisherIds
     * @return int[]
     */
    private function parsePublisherIds(string $publisherIds): array
    {
        if ($publisherIds === '') {
            return [];
        }
        return array_map('intval', explode(',', $publisherIds));
    }

    private function update(int $pubId, string $version): int
    {
        if ($pubId <= 0) {
            print "Error: publication id must be greater than 0\n";
        }
        try {
            $pm = $this->publicationManager;
            $pm->updatePublication($pubId, $version);
            print "Publication $pubId updated\n";
            return 0;
        } catch (PublicationNotFoundException) {
            print "Error: publication not found\n";
            return 1;
        } catch (ResourceNotFoundException) {
            print "Error: publication's resource data not found\n";
            return 1;
        }
    }


    private function list(int $publisherId): int
    {
        $pm = $this->publicationManager;
        $listings = $pm->list($publisherId);
        if (count($listings) === 0) {
            print "No publications found\n";
            return 0;
        }
        print "Current Publications\n";
        foreach ($listings as $listing) {
            print " - $listing->id  {$listing->type->value}  $listing->title $listing->versionTimeString\n";
        }
        return 0;
    }

    private function remove(int $pubId): int
    {
        if ($pubId <= 0) {
            print "Error: publication id must be greater than 0\n";
            return 1;
        }
        try {
            $pm = $this->publicationManager;
            $pm->deletePublication($pubId);
            return 0;
        } catch (PublicationNotFoundException) {
            print "Error: publication not found\n";
            return 1;
        }
    }

    private function show(int $publisherId, int $pubId): int
    {
        if ($pubId <= 0) {
            print "Error: publication id must be greater than 0\n";
            return 1;
        }
        try {
            $pm = $this->publicationManager;
            $data = $pm->getPublication($pubId, $publisherId);
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
        } catch (PublicationNotFoundException) {
            print "Error: publication not found\n";
            return 1;
        }
    }


    private function export(string $format, int $publisherId, int $pubId): int
    {
        if ($pubId <= 0) {
            print "Error: publication id must be greater than 0\n";
            return 1;
        }

        if ($format !== 'json' && $format !== 'tei') {
            print "Error: export format must be 'json' or 'tei'\n";
            return 1;
        }

        try {
            $pm = $this->publicationManager;
            $pubData = $pm->getPublication($pubId, $publisherId);


            if ($format === 'tei' && $pubData->type !== PublicationType::Edition) {
                print "Error: TEI export is only supported for edition publications\n";
                return 1;
            }

            $json = json_encode(
                    $pubData,
                    JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
                ) . "\n";

            if ($format === 'json') {
                $fileName = sprintf('%s.json', $pubId);

                if (@file_put_contents($fileName, $json . "\n") === false) {
                    print "Error: could not write publication JSON to file '$fileName'\n";
                    return 1;
                }
            } else {
                $fileName = sprintf('%s.xml', $pubId);

                $publication = json_decode($json, false, 512, JSON_THROW_ON_ERROR);

                $teiGenerator = new EvtTeiGenerator();
                $xmlCode = $teiGenerator->getEvtTEI(
                    $publication->title,
                    $publication->mainText,
                    $publication->apparatuses,
                    $publication->witnesses,
                    $publication->languageCode,
                    $publication->description,
                    $publication->versionTimeString,
                    $publication->siglaGroups
                );

                if (@file_put_contents($fileName, $xmlCode) === false) {
                    print "Error: could not write TEI XML to file '$fileName'\n";
                    return 1;
                }

            }

            print "Publication $pubId exported to '$fileName'\n";
            return 0;

        } catch (PublicationNotFoundException) {
            print "Error: publication not found\n";
            return 1;
        } catch (Exception $e) {
            print "Error: could not encode publication as JSON: " . $e->getMessage() . "\n";
            return 1;
        }
    }

    private function printTranscriptionData(TranscriptionData $data): void
    {
        $linesToPrint = [];
        $linesToPrint[] = sprintf("Document %d: %s", $data->id, $data->title);
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

}
