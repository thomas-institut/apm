<?php

namespace APM\CommandLine\ApmCtlUtility;

use APM\Actions\GetTranscriptionDataForDocument;
use APM\Api\Action\PageUpdateDefinition;
use APM\CommandLine\CommandLineUtility;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use RuntimeException;
use ThomasInstitut\ApmPublicationApi\TranscriptionData;
use ThomasInstitut\DataTable\Exception\InvalidTimeStringException;

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
           'remove <id>' => 'removes a publication by id',
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
        $option = $argv[1] ?? '';

        return match ($option) {
            'list' => $this->list(),
            'remove' => $this->remove((int)$argv[2]),
            'show' => $this->show((int)$argv[2]),
            'preview' => $this->preview($argv[2], (int)$argv[3]),
            default => 1,
        };
    }


    private function list() : int {
        print "List publications\n";
        print "Not implemented yet\n";
        return 0;
    }

    private function remove(int $pubId) : int {
        if ($pubId <= 0) {
            print "Error: publication id must be greater than 0\n";
            return 1;
        }
        print "Remove publication $pubId\n";
        print "Not implemented yet\n";
        return 0;
    }

    private function show(int $pubId) : int {
        if ($pubId <= 0) {
            print "Error: publication id must be greater than 0\n";
            return 1;
        }
        print "Show publication $pubId\n";
        print "Not implemented yet\n";
        return 0;
    }


    private function preview(string $type, int $id) : int {
        if ($id <= 0) {
            print "Error: resource id must be greater than 0\n";
            return 1;
        }
        if ($type === 'tx' || $type === 'tx-full' || $type === 'transcription') {
            $type = 'transcription';
        }
        try {
            $action = new GetTranscriptionDataForDocument($this->getSystemManager()->getDocumentManager(), $this->getSystemManager()->getTranscriptionManager());
            $data = $action->getTranscriptionDataForDocument($id);
            $this->printTranscriptionData($data);
            return 0;
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface) {
            print "Error initializing system\n";
            return 1;
        } catch (DocumentNotFoundException|PageNotFoundException $e) {
            print "Error: resource not found" . $e->getMessage() . "\n";
            return 1;
        } catch (InvalidTimeStringException|RuntimeException $e) {
            print "Error: Run time error: " . $e->getMessage() . "\n";
            return 1;
        }
    }

    private function printTranscriptionData(TranscriptionData $data) : void {
        $linesToPrint = [];
        $linesToPrint[] =  sprintf("Document %d: %s", $data->id, $data->title);
        $linesToPrint[] = sprintf("(%d pages)", count($data->pages));
        $linesToPrint[] = " ";
        foreach ($data->pages as $page) {
            $linesToPrint[] = sprintf("Page %d, foliation: %s\n", $page->pageNumber, $page->foliation);
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