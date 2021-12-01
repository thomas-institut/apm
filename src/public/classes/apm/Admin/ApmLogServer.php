<?php

namespace APM\Admin;

/**
 * A server for websocketd that interacts with a log file
 */
class ApmLogServer
{
    const USAGE = "usage: apmlogserver <logFileName>\n";

    const LOOP_FREQUENCY = 5; // in Hz (times per second)
    const LOG_POLL_INTERVAL = 0.5;   // in seconds

    const LOG_LEVEL_INFO = 'INFO';
    const LOG_LEVEL_DEBUG = 'DEBUG';

    // OUTPUT
    const OUTPUT_LIVE = 'LIVE';
    const OUTPUT_SERVER = 'SERVER';
    const OUTPUT_ERROR = 'ERROR';
    const OUTPUT_WARNING = 'WARNING';

    // INPUT REQUESTS
    const REQUEST_SERVER = 'server';
    const REQUEST_LIVE = 'live';

    /**
     * @var mixed
     */
    private string $logFileName;
    private int $lastLogFileEndPosition;

    public function __construct()
    {
    }

    public function run($argc, $argv): bool
    {
        if ($argc != 2) {
            print self::USAGE;
            return false;
        }

        $this->logFileName = $argv[1];
        $this->log("Using file $this->logFileName");

        $logFileHandle = fopen($this->logFileName, "r");
        $this->lastLogFileEndPosition = $this->getFileEndPosition($logFileHandle);
        fclose($logFileHandle);

        stream_set_blocking(STDIN, false);

        $lastPollTime = microtime(true);
        $nanoSleepTime = 1e9 / self::LOOP_FREQUENCY;

        while (1) {
            // Wait for next cycle
            time_nanosleep(0, $nanoSleepTime);

            // Process stdin
            $stdinLine = fgets(STDIN);
            if ($stdinLine !== false) {
               $commandData = $this->getRequest($stdinLine);
               switch($commandData['request']) {
                   case self::REQUEST_SERVER:
                        $this->outputCommand(self::OUTPUT_SERVER, $this->getServerInfo());
                        break;

                   case '':
                       $this->log("Received null request");
                       break;

                   default:
                       $this->log(sprintf("Received '%s' request, not implemented yet", $commandData['command']));
               }
            }

            // Poll log file
            $currentTime = microtime(true);
            if (($currentTime - $lastPollTime) >= self::LOG_POLL_INTERVAL) {
                $lastPollTime = $currentTime;
                $newLines = $this->getNewLogLines();
                if (count($newLines) !== 0) {
                    $this->log("Sending " . count($newLines) . " new lines");
                }
                foreach ($newLines as $line) {
                    $this->outputCommand(self::OUTPUT_LIVE, $line);
                }
            }
        }
    }

    protected function outputCommand(string $command, string $payload) {
        fprintf(STDOUT, "%s %s\n", $command, $payload);
    }

    protected function log(string $message, string $level = self::LOG_LEVEL_INFO) {
        fprintf(STDERR, "%s: %s\n", $level, $message);
    }

    protected function getRequest(string $inputLine): array
    {
        $inputLine = trim($inputLine);
        //$this->log(sprintf("Processing input line '%s'", $inputLine), self::LOG_LEVEL_DEBUG);
        $fields = explode( ' ', $inputLine);
        if (count($fields)===0) {
            return [ 'request' => '', 'argv' => [], 'argc' => 0];
        }
        return [
            'request' => strtolower($fields[0]),
            'argv' => $fields,
            'argc' => count($fields)
            ];
    }

    private function getFileEndPosition($handle) : int {
        fseek($handle, 0, SEEK_END);
        return ftell($handle);
    }

    private function getNewLogLines() : array{
        $handle = fopen($this->logFileName, "r");
        $currentEndPosition = $this->getFileEndPosition($handle);
        $newLines = [];
        if ($currentEndPosition !== $this->lastLogFileEndPosition) {
            // there are changes!
            fseek($handle, $this->lastLogFileEndPosition);
            while ($line = fgets($handle)){
                $newLines[] = trim($line);
            }
            $this->lastLogFileEndPosition = $currentEndPosition;
        }
        fclose($handle);
        return $newLines;
    }

    private function getServerInfo() : string {
        return trim(`uname -n`);
    }
}