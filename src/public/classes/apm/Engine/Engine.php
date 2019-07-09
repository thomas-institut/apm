<?php


namespace APM\Engine;

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
abstract class Engine
{
    const ERROR_NOERROR=0;

    const DEFAULT_ENGINE_NAME = 'Generic Edition Engine';

    /** @var float */
    protected $duration;
    /** @var int */
    protected $errorCode;
    /** @var string */
    protected $errorContext;
    /** @var float */
    protected $startMicroTime;
    /** @var float */
    protected $endMicroTime;
    /** @var string */
    protected $engineName;


    public function __construct(string $engineName) {
        if ($engineName === '') {
            $engineName = self::DEFAULT_ENGINE_NAME; // @codeCoverageIgnore
        }
        $this->engineName = $engineName;
        $this->resetError();
        $this->resetChronometer();
    }

    public function reset() {
        $this->resetChronometer();
        $this->resetError();
    }

    public function resetChronometer() {
        $this->duration = 0;
    }

    public function resetError() {
        $this->errorCode = self::ERROR_NOERROR;
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

    public function getRunDetails() : array {
        return [
            'engineName' => $this->getName(),
            'errorCode' => $this->getErrorCode(),
            'errorContext' => $this->getErrorContext(),
            'runDateTime' => $this->getRunDateTimeString(),
            'duration' => $this->getDuration()
        ];
    }

    public function getName() : string {
        return $this->engineName;
    }

    //
    // PROTECTED
    //
    protected function startChrono() {
        $this->duration = 0;
        $this->startMicroTime = microtime(true);
    }

    protected function endChrono() {
        $this->endMicroTime = microtime(true);
        $this->duration = $this->endMicroTime - $this->startMicroTime;
    }

    protected function setError(int $code, string $context='') {
        $this->errorCode = $code;
        $this->errorContext = $context;
    }

}