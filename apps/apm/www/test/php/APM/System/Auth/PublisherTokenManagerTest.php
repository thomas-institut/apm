<?php

namespace APM\System\Auth;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Schema\Entity;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\EntitySystem\EntityData;

class PublisherTokenManagerTest extends TestCase
{
    /**
     * Verifies generated tokens are persisted as hashes and resolve to their Publisher.
     */
    public function testCreateTokenStoresHashAndCanResolvePublisher(): void
    {
        $storedHash = '';
        $entityData = $this->createMock(EntityData::class);
        $entityData->expects($this->once())
            ->method('getObjectForPredicate')
            ->with(Entity::pPublisherTokenHash)
            ->willReturnCallback(function () use (&$storedHash) {
                return $storedHash;
            });

        $entitySystem = $this->createMock(ApmEntitySystemInterface::class);
        $entitySystem->method('validateEntity')->willReturn(true);
        $entitySystem->expects($this->once())
            ->method('makeStatement')
            ->willReturnCallback(function ($subject, $predicate, $object, $author) use (&$storedHash): int {
                $this->assertSame(123, $subject);
                $this->assertSame(Entity::pPublisherTokenHash, $predicate);
                $this->assertSame(Entity::System, $author);
                $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $object);
                $storedHash = $object;
                return 1;
            });
        $entitySystem->expects($this->once())
            ->method('getEntityData')
            ->with(123)
            ->willReturn($entityData);

        $manager = new PublisherTokenManager($entitySystem);
        $token = $manager->createToken(123);

        $this->assertMatchesRegularExpression('/^123\.[a-f0-9]{64}$/', $token);
        $this->assertSame(hash('sha256', $token), $storedHash);
        $this->assertSame(123, $manager->getPublisherIdForToken($token));
        $this->assertSame(-1, $manager->getPublisherIdForToken('invalid-token'));
    }

    /**
     * Verifies tokens cannot be issued for entities of another type.
     */
    public function testCreateTokenRejectsNonPublisherEntity(): void
    {
        $entitySystem = $this->createMock(ApmEntitySystemInterface::class);
        $entitySystem->expects($this->once())
            ->method('validateEntity')
            ->with(123, Entity::tPublisher)
            ->willReturn(false);
        $entitySystem->expects($this->never())->method('makeStatement');

        $this->expectException(\InvalidArgumentException::class);
        (new PublisherTokenManager($entitySystem))->createToken(123);
    }
}