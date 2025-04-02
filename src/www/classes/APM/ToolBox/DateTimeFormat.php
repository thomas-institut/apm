<?php

namespace APM\ToolBox;

class DateTimeFormat
{

    /**
     * Returns a formatted time as  H:mm:ss
     *
     * E.g.  3821 secs => '1:03:41'
     *
     * @param int $timeInSeconds
     * @return string
     */
    static public function getFormattedTime(int $timeInSeconds) : string {
        [ $hours, $minutes, $secs] = self::getHoursMinutesSeconds($timeInSeconds);
        return sprintf("%d:%02d:%02d", $hours, $minutes, $secs);
    }

    /**
     * Returns a triple with hours, minutes and seconds out of
     * a time in seconds.
     *
     * For example, 3821  returns `[ 1, 3, 41 ]` meaning 1 hour,
     * 3 minutes, 41 seconds.
     *
     * @param int $timeInSeconds
     * @return array
     */
    static public function getHoursMinutesSeconds(int $timeInSeconds) : array {
        $hours = intval($timeInSeconds / 3600);
        $rem = $timeInSeconds % 3600;
        $minutes = intval($rem / 60);
        $secs = $rem % 60;
        return [ $hours, $minutes, $secs ];
    }
}