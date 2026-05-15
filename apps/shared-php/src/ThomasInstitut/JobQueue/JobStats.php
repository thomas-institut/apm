<?php

namespace ThomasInstitut\JobQueue;

/**
 * Collection of daily job statistics.
 */
class JobStats
{
    /** @var DailyJobStats[] */
    private array $dailyStats;

    /**
     * @param DailyJobStats[] $dailyStats
     */
    public function __construct(array $dailyStats)
    {
        $this->dailyStats = $dailyStats;
    }

    /**
     * @return DailyJobStats[]
     */
    public function getDailyStats(): array
    {
        return $this->dailyStats;
    }

    /**
     * @return bool
     */
    public function isEmpty(): bool
    {
        return empty($this->dailyStats);
    }
}
