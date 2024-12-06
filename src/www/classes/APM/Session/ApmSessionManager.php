<?php

namespace APM\Session;

use APM\Session\Exception\SessionIsAlreadyClosedException;
use APM\Session\Exception\SessionNotFoundException;
use Exception;
use InvalidArgumentException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use RuntimeException;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\InvalidRowForUpdate;
use ThomasInstitut\DataTable\RowAlreadyExists;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\TimeString\InvalidTimeZoneException;
use ThomasInstitut\TimeString\MalformedStringException;
use ThomasInstitut\TimeString\TimeString;

class ApmSessionManager implements SessionManager, LoggerAwareInterface
{

    use LoggerAwareTrait;
    private DataTable $sessionsTable;
    private DataTable $logTable;

    public function __construct(DataTable $sessionsTable, DataTable $sessionLogTable, ?LoggerInterface $logger = null)
    {
        $this->sessionsTable = $sessionsTable;
        $this->logTable = $sessionLogTable;
        $this->logger = $logger === null ? new NullLogger() : $logger;
    }

    /**
     * @inheritDoc
     */
    public function startSession(int $userId): int
    {
       $sessionId = Tid::generateUnique();
       $session = new Session($sessionId, $userId);
       return $this->saveSession($session) ? $sessionId : -1;
    }

    /**
     * @inheritDoc
     */
    public function closeSession(int $sessionId): void
    {
        $session = $this->getSessionFromDatabase($sessionId);
        if ($session === null) {
            $this->logger->warning("Trying to close non-existent session $sessionId");
            throw new SessionNotFoundException("Session $sessionId not found");
        }
        $session->close();
        $this->saveSession($session);
    }

    private function saveSession(Session $session)  : bool   {
        $sessionId = $session->getId();

        if ($sessionId <= 0) {
            $this->logger->warning("Session id not set when trying to save session to database");
            return false;
        }
        $row = [
            'session_id' => $sessionId,
            'user_id' => $session->getUserId(),
            'is_open' => $session->isOpen() ? '1' : '0',
            'data' => serialize($session)
        ];
        try {
            $rowId = $this->getSessionDbRowId($sessionId);
            if ($rowId > 0) {
                $row['id'] = $rowId;
                $this->sessionsTable->updateRow($row);
            } else {
                $this->sessionsTable->createRow($row);
            }
        } catch (Exception $exception) {
            $message = $exception->getMessage();
            $this->logger->error("Exception caught while saving session: $message", [ 'class' => get_class($exception)]);
            return false;
        }
        return true;
    }


    private function getSessionDbRowId(int $sessionId): int {
        $row = $this->sessionsTable->findRows(['session_id' => $sessionId])->getFirst();
        if ($row === null) {
            return -1;
        }
        return $row['id'];
    }

    private function getSessionFromDatabase(int $sessionId): ?Session {
        $row = $this->sessionsTable->findRows(['session_id' => $sessionId])->getFirst();
        if ($row === null) {
            return null;
        }
        return unserialize($row['data']);
    }

    /**
     * @inheritDoc
     */
    public function logToSession(int $sessionId, string $source, string $message, mixed $data = null, ?string $time = null): void
    {
        if ($source === '') {
            throw new InvalidArgumentException("Source is not set");
        }
        if ($message === '') {
            throw new InvalidArgumentException("Message is empty");
        }
        $session = $this->getSessionFromDatabase($sessionId);
        if ($session === null) {
            throw new SessionNotFoundException("Session $sessionId not found");
        }
        if ($time === null) {
            $time = TimeString::now();
        } else {
            try {
                $time = TimeString::fromVariable($time);
            } catch (InvalidTimeZoneException|MalformedStringException $e) {
                $this->logger->warning("Bad time given to log to session: $time, using current time");
                $time = TimeString::now();
            }
        }

        $extraData = $data === null ? null : json_encode($data);
        if ($extraData === false) {
            throw new RuntimeException("Failed to JSON encode data");
        }
        try {
            $this->logTable->createRow([
                'session_id' => $sessionId,
                'time' => $time,
                'source' => $source,
                'msg' => $message,
                'extra_data' => $extraData,
            ]);
        } catch (Exception $e) {
            throw new RuntimeException("Failed to create log entry for session $sessionId in database: " . $e->getMessage());
        }
    }

    /**
     * @inheritDoc
     */
    public function mergeSessions(int $oldSessionId, int $newSessionId): void
    {
        $oldSession = $this->getSessionFromDatabase($oldSessionId);
        if ($oldSession === null) {
            throw new SessionNotFoundException("Session $oldSessionId not found");
        }
        if (!$oldSession->isOpen()) {
            throw new SessionIsAlreadyClosedException("Session $oldSessionId closed");
        }
        $newSession = $this->getSessionFromDatabase($newSessionId);
        if ($newSession === null) {
            throw new SessionNotFoundException("Session $newSessionId not found");
        }
        if (!$newSession->isOpen()) {
            throw new SessionIsAlreadyClosedException("Session $newSessionId closed");
        }

        $logRows = $this->logTable->findRows([ 'session_id' => $oldSessionId ]);

        $this->logTable->startTransaction();
        $this->sessionsTable->startTransaction();
        foreach ($logRows as $logRow) {
            $logRow['session_id'] = $newSessionId;
            try {
                $this->logTable->updateRow($logRow);
            } catch (InvalidRowForUpdate $e) {
                $rowId = $logRow['id'];
                $this->logTable->rollBack();
                $this->sessionsTable->rollBack();
                throw new \RuntimeException("Failed to move log entry $rowId from session $oldSessionId to session $newSessionId: " . $e->getMessage());
            }
        }
        $this->sessionsTable->deleteRow($oldSessionId);
        $this->logTable->commit();
        $this->sessionsTable->commit();
    }
}