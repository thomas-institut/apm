<?php

namespace APM\System\Auth;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Schema\Entity;
use Random\RandomException;

class PublisherTokenManager
{
    public function __construct(private readonly ApmEntitySystemInterface $entitySystem)
    {
    }

    /**
     * Generates and stores a new bearer token for a publisher.
     *
     * The raw token is returned only once; only its SHA-256 hash is stored.
     *
     * @param int $publisherId
     * @return string
     * @throws RandomException
     */
    public function createToken(int $publisherId): string
    {
        if (!$this->entitySystem->validateEntity($publisherId, Entity::tPublisher)) {
            throw new \InvalidArgumentException("Entity $publisherId is not a publisher");
        }

        $token = $publisherId . '.' . bin2hex(random_bytes(32));
        $this->entitySystem->makeStatement(
            $publisherId,
            Entity::pPublisherTokenHash,
            hash('sha256', $token),
            Entity::System
        );
        return $token;
    }

    /**
     * Returns the publisher ID associated with a valid bearer token, or -1 if invalid.
     *
     * @param string $token
     * @return int
     */
    public function getPublisherIdForToken(string $token): int
    {
        if (!preg_match('/^([1-9][0-9]*)\.([a-f0-9]{64})$/D', $token, $matches)) {
            return -1;
        }

        $publisherId = (int)$matches[1];
        if (!$this->entitySystem->validateEntity($publisherId, Entity::tPublisher)) {
            return -1;
        }

        $entityData = $this->entitySystem->getEntityData($publisherId);
        $storedHash = $entityData->getObjectForPredicate(Entity::pPublisherTokenHash);
        if (!is_string($storedHash) || !hash_equals($storedHash, hash('sha256', $token))) {
            return -1;
        }
        return $publisherId;
    }
}