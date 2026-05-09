<?php

namespace APM\CommandLine\ApmCtlUtility;

use APM\CommandLine\CommandLineUtility;
use APM\Jobs\ApmJobName;
use APM\System\Job\ScheduledJobState;


class JobQueueTool extends CommandLineUtility implements AdminUtility
{

    const string CMD = 'jobs';

    const string DESCRIPTION = "Job queue management functions";

    const int NUM_TEST_JOBS = 5;

    const string CMD_TEST = 'test';
    const string CMD_PROCESS = 'process';
    const string CMD_CLEAN = 'clean';
    const string CMD_INFO = 'info';
    const string CMD_STATS = 'stats';
    const string CMD_RESET_STATS = 'reset-stats';

    const string CMD_LIST = 'list';
    const string CMD_RESCHEDULE = 'reschedule';

    private array $commandInfo = [];


    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv);

        $this->commandInfo[] = [
            'command' => self::CMD_INFO,
            'info' => "prints information about the current job queue",
        ];

        $this->commandInfo[] = [
            'command' => self::CMD_STATS,
            'info' => "displays the number of completed and failed tasks per day",
        ];

        $this->commandInfo[] = [
            'command' => self::CMD_RESET_STATS,
            'info' => "resets all job statistics",
        ];

        $this->commandInfo[] = [
            'command' => self::CMD_LIST,
            'usage' => '[waiting|running|error]',
            'info' => "lists all jobs or jobs in the given state",
        ];


        $this->commandInfo[] = [
            'command' => self::CMD_CLEAN,
            'info' => "removes all dead jobs from the queue"
        ];


        $this->commandInfo[] = [
            'command' => self::CMD_RESCHEDULE,
            'usage' => ' <jobId> [<jobId2> ...]',
            'info' => 'reschedules the given jobs'
        ];

        $this->commandInfo[] = [
            'command' => self::CMD_TEST,
            'info' => "adds " . self::NUM_TEST_JOBS . " test jobs to the queue"
        ];


        $this->commandInfo[] = [
            'command' => self::CMD_PROCESS,
            'info' => "process the current job queue (normally done automatically by the APM daemon)"
        ];

    }

    public function main($argc, $argv): int
    {
        if ($argc === 1) {
            print $this->getHelp();
            return 1;
        }

        switch ($argv[1]) {
            case self::CMD_TEST:
                $this->test();
                break;

            case self::CMD_PROCESS:
                $this->process();
                break;

            case self::CMD_CLEAN:
                $this->clean();
                break;

            case self::CMD_INFO:
                $this->info();
                break;

            case self::CMD_STATS:
                $this->stats();
                break;

            case self::CMD_RESET_STATS:
                $this->resetStats();
                break;

            case self::CMD_LIST:

                if (!isset($argv[2])) {
                    $this->printErrorMsg("Need a type of job to list: all, waiting, running, error");
                    return 1;
                }
                $this->list($argv[2]);
                break;

            case self::CMD_RESCHEDULE:
                if (!isset($argv[2])) {
                    $this->printErrorMsg("Need at least one jobId to reschedule");
                    return 1;
                }
                $errors = false;
                for ($i = 2; $i < $argc; $i++) {
                    $jobId = $argv[$i];
                    if ($jobId === '') {
                        $this->printErrorMsg("Invalid job ID '$argv[$i]'");
                    } else {
                        $result = $this->rescheduleJob($jobId);
                        if (!$result) {
                            $errors = true;
                        }
                    }
                }
                return $errors ? 1 : 0;

            default:
                print "Unrecognized option: " . $argv[1] . "\n";
                return 1;
        }
        return 0;
    }

    private function rescheduleJob(string $jobId): bool
    {
        $result = $this->getSystemManager()->getJobManager()->rescheduleJob($jobId);
        if ($result === '') {
            $this->printErrorMsg("Job $jobId does not exist");
            return false;
        } else {
            print "Job $jobId rescheduled successfully\n";
            return true;
        }
    }

    private function list(string $state): void
    {

        $validStates = [ScheduledJobState::WAITING, ScheduledJobState::RUNNING, ScheduledJobState::ERROR];

        if ($state === 'all') {
            $statesToList = $validStates;
        } else {
            if (!in_array($state, $validStates)) {
                $this->printErrorMsg("Invalid state '$state'");
                exit(1);
            }
            $statesToList = [$state];
        }

        foreach ($statesToList as $state) {
            $jobs = $this->getSystemManager()->getJobManager()->getJobsByState($state);
            $countJobs = count($jobs);
            printf("%s, %d job(s)", $state, $countJobs);
            if ($countJobs === 0) {
                print "\n";
            } else {
                print ":\n";
                $this->printJobs($jobs);
            }
        }
    }


    private function printJobs(array $jobs): void
    {
        foreach ($jobs as $job) {
            printf("   %s: %s\t%s, %s, scheduled at %s, attempts %d/%d, last run at %s\n",
                $job['id'], $job['state'], $job['name'], $job['description'], $job['scheduled_at'], $job['completed_runs'] ?? 0, $job['max_attempts'], $job['last_run_at'] ?? 'never');
        }
    }

    private function info(): void
    {
        $jm = $this->getSystemManager()->getJobManager();

        $counts = $jm->getJobCountsByState();

        $total = 0;


        foreach ($counts as $count) {
            $total += $count;
        }
        if ($total == 0) {
            print "The job queue is empty\n";
        } else {
            $finishedWithError = $counts[ScheduledJobState::ERROR];
            if ($finishedWithError === $total) {
                printf("There are %d jobs in the queue, all finished with error\n", $total);
            } else {
                printf("There %d jobs in the queue: %d running, %d waiting, %d finished with error\n",
                    $total, $counts[ScheduledJobState::RUNNING], $counts[ScheduledJobState::WAITING], $counts[ScheduledJobState::ERROR]);
            }
        }
    }

    /**
     * Displays daily job completion and failure statistics.
     *
     * @return void
     */
    private function stats(): void
    {
        $jm = $this->getSystemManager()->getJobManager();
        $jobStats = $jm->getJobStats();

        if ($jobStats->isEmpty()) {
            print "No job statistics available.\n";
            return;
        }

        print str_repeat("=", 38) . "\n";
        printf("%-10s %12s %12s\n", "Date", "Completed", "Failed");
        print str_repeat("-", 38) . "\n";

        foreach ($jobStats->getDailyStats() as $dailyStat) {
            printf("%-10s %12d %12d\n",
                $dailyStat->getDate(),
                $dailyStat->getCompleted(),
                $dailyStat->getFailed()
            );
        }
        print str_repeat("=", 38) . "\n";
    }

    /**
     * Resets all job statistics.
     *
     * @return void
     */
    private function resetStats(): void
    {
        $this->getSystemManager()->getJobManager()->resetJobStats();
        print "Job statistics reset successfully.\n";
    }

    private function test(): void
    {
        $jm = $this->getSystemManager()->getJobManager();

        for ($i = 0; $i < self::NUM_TEST_JOBS; $i++) {
            $jm->scheduleJob(ApmJobName::NULL_JOB, "No. $i", ['returnValue' => ($i % 2) === 0], $i, $i + 1, 4 * ($i + 1));
        }
    }

    private function process(): void
    {
        $this->getSystemManager()->getJobManager()->process();
    }

    private function clean(): void
    {
        $this->getSystemManager()->getJobManager()->cleanQueue();
    }

    public function getCommand(): string
    {
        return self::CMD;
    }

    public function getHelp(): string
    {
        $tab = '   ';

        $help = self::CMD . " <option>\n\n";

        foreach ($this->commandInfo as $cmdInfo) {
            $usage = $cmdInfo['command'];
            if (isset($cmdInfo['usage'])) {
                $usage .= ' ' . $cmdInfo['usage'];
            }
            $help .= $tab . $usage . ":  " . $cmdInfo['info'] . "\n";
        }
        return $help;
    }

    public function getDescription(): string
    {
        return self::DESCRIPTION;
    }
}