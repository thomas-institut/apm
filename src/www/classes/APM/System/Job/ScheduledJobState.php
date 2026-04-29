<?php

namespace APM\System\Job;

class ScheduledJobState
{
    const string WAITING = 'waiting';
    const string RUNNING = 'running';
    const string ERROR = 'error';
}