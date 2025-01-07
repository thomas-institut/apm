<?php

namespace APM\Session;

use APM\Session\Exception\SessionIsAlreadyClosedException;
use APM\Session\Exception\SessionNotFoundException;

interface SessionManager
{

    /**
     * Registers a new session for the given user.
     *
     * Returns a new session id
     *
     * @param int $userId
     * @return int
     */
    public function startSession(int $userId) : int;

    /**
     * Marks the given session as closed
     *
     * @param int $sessionId
     * @return void
     * @throws SessionNotFoundException
     */
    public function closeSession(int $sessionId) : void;

    /**
     * Erases the old session and moves its log to the new session.
     *
     *
     *
     * @param int $oldSessionId
     * @param int $newSessionId
     * @return void
     * @throws SessionNotFoundException
     * @throws SessionIsAlreadyClosedException
     */
    public function mergeSessions(int $oldSessionId, int $newSessionId) : void;


    /**
     * Adds a log entry to a session's log.
     *
     * @param int $sessionId
     * @param string $source  `'site'` | `'api'`
     * @param string $message non-empty string
     * @param mixed $data  any variable that can be stored as JSON
     * @param string|null $time a TimeString, if null, the current time is used
     * @throws SessionNotFoundException
     */
    public function logToSession(int $sessionId, string $source, string $message, mixed $data = null, ?string $time = null) : void;
}