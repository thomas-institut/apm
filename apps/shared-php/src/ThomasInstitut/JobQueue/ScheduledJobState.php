<?php

namespace ThomasInstitut\JobQueue;

class ScheduledJobState
{
    const string WAITING = 'waiting';
    const string RUNNING = 'running';
    const string ERROR = 'error';
}