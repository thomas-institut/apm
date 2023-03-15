<?php

namespace APM\CommandLine;

use APM\Jobs\ApmJobName;
use APM\System\Job\NullJobHandler;




class JobQueueTool extends CommandLineUtility
{

    const USAGE = "jobqueue <option>\n\nOptions:\n test\n process\n clean";

    const NUM_TEST_JOBS = 5;

    protected function main($argc, $argv)
    {
        if ($argc === 1) {
            print self::USAGE . "\n";
            return false;
        }

        switch($argv[1]) {
            case 'test':
                $this->test();
                break;

            case 'process':
                $this->process();
                break;

            case 'clean':
                $this->clean();
                break;


            default:
                print "Unrecognized option: "  . $argv[1] ."\n";
                return false;
        }
    }

    private function test()
    {
        $jm = $this->systemManager->getJobManager();

        for ($i = 0; $i< self::NUM_TEST_JOBS; $i++) {
            $jm->scheduleJob(ApmJobName::NULL_JOB, "No. $i", [ 'returnValue' => ($i % 2) === 0 ], $i, $i+1, $i);
        }
    }

    private function process()
    {
        $this->systemManager->getJobManager()->process();
    }

    private function clean()
    {
        $this->systemManager->getJobManager()->cleanQueue();
    }
}