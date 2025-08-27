<?php


namespace APM\Engine;

use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\NullLogger;

/**
 * Basic class for algorithm engines
 *
 * An Engine is a class that normally provides a generic implementation of an algorithm such as automatic
 * collation generation or automatic edition generation.
 *
 * The base class provides methods for error handling, reporting and profiling so that the descendants only
 * take care of actually implementing the desired functionality
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class Engine implements LoggerAwareInterface
{
    use LoggerAwareTrait;
    const int ERROR_NO_ERROR = 0;

    const string DEFAULT_ENGINE_NAME = 'Generic Edition Engine';

    protected float $duration;
    protected int $errorCode;
    protected string $errorContext;
    protected float $startMicroTime;
    protected float $endMicroTime;
    protected string $engineName;


    public function __construct(string $engineName) {
        if ($engineName === '') {
            $engineName = self::DEFAULT_ENGINE_NAME; // @codeCoverageIgnore
        }
        $this->engineName = $engineName;
        $this->resetError();
        $this->resetChronometer();
        $this->logger = new NullLogger();
    }

    public function reset(): void
    {
        $this->resetChronometer();
        $this->resetError();
    }

    public function resetChronometer(): void
    {
        $this->duration = 0;
    }

    public function resetError(): void
    {
        $this->errorCode = self::ERROR_NO_ERROR;
        $this->errorContext = '';
    }

    public function getRunDateTime() : float {
        return $this->startMicroTime;
    }

    public function getRunDateTimeString() : string {
        return strftime("%d %b %Y, %H:%M:%S %Z", $this->getRunDateTime());
    }

    public function getDuration() : float {
        return $this->duration;
    }

    public function getErrorCode() : int {
        return $this->errorCode;
    }

    public function getErrorContext() : string{
        return $this->errorContext;
    }

    public function getErrorMessage() : string {
        return $this->getErrorContext();
    }

    public function getRunDetails() : EngineRunDetails {
        $details = new EngineRunDetails();
        $details->engineName = $this->getName();
        $details->errorCode = $this->getErrorCode();
        $details->errorContext = $this->getErrorContext();
        $details->runDateTime = $this->getRunDateTimeString();
        $details->duration = $this->getDuration();
        return $details;
    }

    public function getName() : string {
        return $this->engineName;
    }

    //
    // PROTECTED
    //
    protected function startChrono(): void
    {
        $this->duration = 0;
        $this->startMicroTime = microtime(true);
    }

    protected function endChrono(): void
    {
        $this->endMicroTime = microtime(true);
        $this->duration = $this->endMicroTime - $this->startMicroTime;
    }

    protected function setError(int $code, string $context=''): void
    {
        $this->errorCode = $code;
        $this->errorContext = $context;
    }

}