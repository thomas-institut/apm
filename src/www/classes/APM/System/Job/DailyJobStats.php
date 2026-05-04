<?php

namespace APM\System\Job;

/**
 * Statistics for jobs on a specific date.
 */
class DailyJobStats
{
    private string $date;
    private int $completed;
    private int $failed;

    /**
     * @param string $date
     * @param int $completed
     * @param int $failed
     */
    public function __construct(string $date, int $completed, int $failed)
    {
        $this->date = $date;
        $this->completed = $completed;
        $this->failed = $failed;
    }

    /**
     * @return string
     */
    public function getDate(): string
    {
        return $this->date;
    }

    /**
     * @return int
     */
    public function getCompleted(): int
    {
        return $this->completed;
    }

    /**
     * @return int
     */
    public function getFailed(): int
    {
        return $this->failed;
    }
}
