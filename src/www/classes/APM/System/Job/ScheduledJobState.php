<?php

namespace APM\System\Job;

class ScheduledJobState
{
    const WAITING = 'waiting';
    const RUNNING = 'running';
    const DONE = 'done';
    const ERROR = 'error';
}