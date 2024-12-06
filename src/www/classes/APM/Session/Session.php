<?php

namespace APM\Session;

class Session
{

    private int $id;
    private int $userId;
    private bool $isOpen;

    public function __construct(int $id = 0, int $userId = 0)
    {
        $this->id = $id;
        $this->userId = $userId;
        $this->isOpen = false;
    }

    public function isOpen(): bool {
        return $this->isOpen;
    }

    public function open() : void {
        $this->isOpen = true;
    }

    public function close(): void {
        $this->isOpen = false;
    }

    public function getId() : int {
        return $this->id;
    }

    public function getUserId() : int {
        return $this->userId;
    }
}