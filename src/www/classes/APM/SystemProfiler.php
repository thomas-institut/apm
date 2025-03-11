<?php

namespace APM;


class SystemProfiler
{

    static private float $start;
    static private array $laps;

    static private bool $started = false;

    static private string $name = '';


    static public function start() : void {
        self::$start = self::now();
        self::$laps = [];
        self::$started = true;
    }

    static public function setName(string $name): void
    {
        self::$name = $name;
    }

    static public function getName() : string {
        return self::$name;
    }

    static public function lap(string $name) : void {
        if (!self::$started) {
            return;
        }
        self::$laps[] = [ 'name' => $name, 'start' => self::now() - self::$start];
    }

    static public function getCurrentTotalTimeInMs() : float {
         return (self::now() - self::$start) * 1000;
    }

    static public function getTotalTimeInMs() : float {
        if (count(self::$laps) < 1) {
            return -1;
        }
        return self::$laps[count(self::$laps) -1]['start'] * 1000;
    }

    static public function getLaps($onlyDescriptions = true) : array {
        if (!self::$started) {
            return [];
        }
        $lastLapStartInMs = 0;
        $lapReports = [];
        foreach(self::$laps as $index => $lap) {
            $lapStartInMs = $lap['start'] * 1000;
            $deltaInMs = $lapStartInMs - $lastLapStartInMs;
            $description = sprintf("(%d) %s : %.3f ms  (@ %.3f ms)", $index+1, $lap['name'], $deltaInMs, $lapStartInMs);
            if ($onlyDescriptions) {
                $lapReports[] = $description;
            } else {
                $lapReports[] = [
                    'name' => $lap['name'],
                    'start' => $lastLapStartInMs,
                    'end' => $lapStartInMs,
                    'delta' => $deltaInMs,
                ];
            }
            $lastLapStartInMs = $lapStartInMs;
        }
        return $lapReports;
    }

    static private function now() : float {
        return microtime(true);
    }

}