<?php

namespace APM\CommandLine;

use APM\Jobs\ApmJobName;
use APM\System\Job\ScheduledJobState;


class JobQueueTool extends CommandLineUtility implements AdminUtility
{

    const CMD = 'jobs';

    const DESCRIPTION = "Job queue management functions";

    const NUM_TEST_JOBS = 5;

    const CMD_TEST = 'test';
    const CMD_PROCESS = 'process';
    const CMD_CLEAN = 'clean';
    const CMD_INFO = 'info';
    const CMD_FAILED = 'failed';

    const CMD_PENDING = 'pending';

    const CMD_RESCHEDULE = 'reschedule';

    private array $commandInfo = [];


    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv);

        $this->commandInfo[] = [
            'command' => self::CMD_INFO,
            'info' => "prints information about the current job queue",
        ];


        $this->commandInfo[] = [
            'command' => self::CMD_CLEAN,
            'info' => "removes all finished jobs from the queue"
        ];

        $this->commandInfo[] = [
            'command' => self::CMD_PENDING,
            'info' => 'prints information about pending jobs'
        ];

        $this->commandInfo[] = [
            'command' => self::CMD_FAILED,
            'info' => 'prints information about jobs that finished with error'
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

        switch($argv[1]) {
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

            case self::CMD_FAILED:
                $this->failed();
                break;

            case self::CMD_PENDING:
                $this->pending();
                break;

            case self::CMD_RESCHEDULE:
                if (!isset($argv[2])) {
                    $this->printErrorMsg("Need at least one jobId to reschedule");
                    return 1;
                }
                $errors = false;
                for ($i = 2; $i < $argc; $i++) {
                    $jobId = intval($argv[$i]);
                    if ($jobId <= 0) {
                        $this->printErrorMsg("Invalid job ID '$argv[$i]'");
                    } else {
                        $result = $this->rescheduleJob($jobId);
                        if (!$result) {
                            $errors =true;
                        }
                    }
                }
                return  $errors ? 1 : 0;

            default:
                print "Unrecognized option: "  . $argv[1] ."\n";
                return 1;
        }
        return 0;
    }

    private function rescheduleJob(int $jobId) : bool {
        $result = $this->systemManager->getJobManager()->rescheduleJob($jobId);
        if ($result === -1) {
            $this->printErrorMsg("Job $jobId does not exist");
            return false;
        } else {
            print "Job $jobId rescheduled successfully\n";
            return true;
        }
    }

    private function failed(): void {
        $failedJobs = $this->systemManager->getJobManager()->getJobsByState(ScheduledJobState::ERROR);

        $countFailedJobs = count($failedJobs);
        if ($countFailedJobs === 0) {
            print "There are no failed jobs in the queue\n";
        } else {
            printf("There are %d failed jobs in the queue: \n", $countFailedJobs);
            $this->printJobs($failedJobs);
        }
    }

    private function pending() : void {
        $pendingJobs = $this->systemManager->getJobManager()->getJobsByState(ScheduledJobState::WAITING);

        $countPendingJobs = count($pendingJobs);
        if ($countPendingJobs === 0) {
            print "There are no pending jobs in the queue\n";
        } else {
            printf("There are %d jobs in the queue waiting to be run: \n", $countPendingJobs);
            $this->printJobs($pendingJobs);
        }
    }

    private function printJobs(array $jobs): void {
        foreach($jobs as $job) {
            printf("   %d: %s\t%s, %s, scheduled at %s, attempts %d/%d, last run at %s\n",
                $job['id'], $job['state'], $job['name'], $job['description'], $job['scheduled_at'], $job['completed_runs'], $job['max_attempts'], $job['last_run_at']);
        }
    }

    private function info() : void {
        $jm = $this->systemManager->getJobManager();

        $counts = $jm->getJobCountsByState();

        $total = 0;


        foreach($counts as $count) {
            $total += $count;
        }
        if ($total == 0) {
            print "The job queue is empty\n";
        } else {
            $finished = $counts[ScheduledJobState::DONE] + $counts[ScheduledJobState::ERROR];
            if ($finished === $total) {
                printf("There are %d jobs in the queue, all finished: %d successfully, %d with error\n",
                   $total, $counts[ScheduledJobState::DONE], $counts[ScheduledJobState::ERROR]);
            } else {
                printf("There %d jobs in the queue: %d running, %d waiting, %d finished successfully, %d finished with error\n",
                    $total, $counts[ScheduledJobState::RUNNING], $counts[ScheduledJobState::WAITING], $counts[ScheduledJobState::DONE], $counts[ScheduledJobState::ERROR]);
            }
        }
    }

    private function test(): void
    {
        $jm = $this->systemManager->getJobManager();

        for ($i = 0; $i< self::NUM_TEST_JOBS; $i++) {
            $jm->scheduleJob(ApmJobName::NULL_JOB, "No. $i", [ 'returnValue' => ($i % 2) === 0 ], $i, $i+1, 4*($i + 1));
        }
    }

    private function process(): void
    {
        $this->systemManager->getJobManager()->process();
    }

    private function clean(): void
    {
        $this->systemManager->getJobManager()->cleanQueue();
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