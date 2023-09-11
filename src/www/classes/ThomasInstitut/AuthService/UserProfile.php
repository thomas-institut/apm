<?php

namespace ThomasInstitut\AuthService;

class UserProfile
{
    public int $userId;
    public string $userName;
    public string $emailAddress;

    public array $metadata;
    /**
     * @var AuthorizationContext[]
     */
    public array $contexts;
}