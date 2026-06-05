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
           'preview <type> <id>' => 'shows a preview of a publication by id'
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
            'preview' => $this->preview($argv[2], (int)$argv[3]),
            default => 0,
        };
    }

    private function add(string $type, int $resourceId, string $version) : int {
        if ($resourceId <= 0) {
            print "Error: resource id must be greater than 0\n";
            return 1;
        }
        if ($type === 'tx' || $type === 'tx-full' ) {
            $type = PublicationType::Transcription;
        }
        if ($type === 'ed' || $type === 'edition') {
            $type = PublicationType::Edition;
        }

        if ($type !== PublicationType::Transcription && $type !== PublicationType::Edition) {
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
                print " - $listing->id  $listing->type  $listing->title $listing->versionTimeString\n";
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
                print "Publication $pubId is of type '$data->type': Not supported for display\n";
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


    private function preview(string $type, int $resourceId) : int {
        if ($resourceId <= 0) {
            print "Error: resource id must be greater than 0\n";
            return 1;
        }
        if ($type === 'tx' || $type === 'tx-full' ) {
            $type = PublicationType::Transcription;
        }

        if ($type !== PublicationType::Transcription) {
            print "Sorry, only transcription publications are supported at this time\n";
            return 1;
        }

        try {
            $ci = $this->container;
            $action = new GetTranscriptionDataForDocument($ci->get(PublicationManagerInterface::class));
            $data = $action->getTranscriptionDataForDocument($resourceId);
            $this->printTranscriptionData($data);
            return 0;
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface) {
            print "Error initializing system\n";
            return 1;
        } catch (ResourceNotFoundException $e) {
            print "Error: resource not found" . $e->getMessage() . "\n";
            return 1;
        } catch (RuntimeException $e) {
            print "Error: Run time error: " . $e->getMessage() . "\n";
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
}