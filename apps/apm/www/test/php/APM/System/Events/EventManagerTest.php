<?php

namespace APM\System\Events;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use RuntimeException;
use UnexpectedValueException;

/**
 * Test event dispatch, payload validation, and listener resolution.
 */
class EventManagerTest extends TestCase
{

    /**
     * Test that listener classes are resolved in registration order and invoked synchronously.
     */
    public function testEmitResolvesAndCallsListenersInRegisteredOrder(): void
    {
        $payload = new EventManagerTestPayload();
        $firstListener = $this->createMock(EventManagerTestFirstListener::class);
        $secondListener = $this->createMock(EventManagerTestSecondListener::class);
        $resolvedListeners = [];
        $handledListeners = [];

        $firstListener->expects($this->once())
            ->method('handle')
            ->with($payload)
            ->willReturnCallback(function () use (&$handledListeners): void {
                $handledListeners[] = 'first';
            });
        $secondListener->expects($this->once())
            ->method('handle')
            ->with($payload)
            ->willReturnCallback(function () use (&$handledListeners): void {
                $handledListeners[] = 'second';
            });

        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->exactly(2))
            ->method('get')
            ->willReturnCallback(function (string $listenerClass) use (
                &$resolvedListeners,
                $firstListener,
                $secondListener
            ): EventListener {
                $resolvedListeners[] = $listenerClass;
                return match ($listenerClass) {
                    EventManagerTestFirstListener::class => $firstListener,
                    EventManagerTestSecondListener::class => $secondListener,
                    default => throw new RuntimeException("Unexpected listener: $listenerClass"),
                };
            });

        $manager = new EventManager($container, new EventRegistry([
            EventManagerTestEvent::class => [
                'payload' => EventManagerTestPayload::class,
                'listeners' => [EventManagerTestFirstListener::class, EventManagerTestSecondListener::class],
            ],
        ]));

        $manager->emit(EventManagerTestEvent::class, $payload);

        $this->assertSame(
            [EventManagerTestFirstListener::class, EventManagerTestSecondListener::class],
            $resolvedListeners
        );
        $this->assertSame(['first', 'second'], $handledListeners);
    }

    /**
     * Test that an event registered without listeners is a no-op.
     */
    public function testEmitDoesNothingWhenEventHasNoListeners(): void
    {
        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->never())->method('get');
        $manager = new EventManager($container, new EventRegistry([
            EventManagerTestEvent::class => [
                'payload' => EventManagerTestPayload::class,
                'listeners' => [],
            ],
        ]));

        $manager->emit(EventManagerTestEvent::class, new EventManagerTestPayload());

        $this->addToAssertionCount(1);
    }

    /**
     * Test that emitting an event not present in the registry fails clearly.
     */
    public function testEmitRejectsUnregisteredEvent(): void
    {
        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->never())->method('get');
        $manager = new EventManager($container, new EventRegistry());

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Event "' . EventManagerTestEvent::class . '" is not registered.');

        $manager->emit(EventManagerTestEvent::class, new EventManagerTestPayload());
    }

    /**
     * Test that emitting a payload of the wrong class fails before resolving listeners.
     */
    public function testEmitRejectsWrongPayloadType(): void
    {
        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->never())->method('get');
        $manager = new EventManager($container, new EventRegistry([
            EventManagerTestEvent::class => [
                'payload' => EventManagerTestPayload::class,
                'listeners' => [EventManagerTestFirstListener::class],
            ],
        ]));

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Payload for event');

        $manager->emit(EventManagerTestEvent::class, new EventManagerTestOtherPayload());
    }

    /**
     * Test that exceptions raised by a listener propagate from emit.
     */
    public function testEmitPropagatesListenerExceptions(): void
    {
        $exception = new RuntimeException('listener failed');
        $listener = $this->createMock(EventManagerTestFirstListener::class);
        $listener->expects($this->once())->method('handle')->willThrowException($exception);
        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->once())->method('get')->with(EventManagerTestFirstListener::class)
            ->willReturn($listener);
        $manager = new EventManager($container, new EventRegistry([
            EventManagerTestEvent::class => [
                'payload' => EventManagerTestPayload::class,
                'listeners' => [EventManagerTestFirstListener::class],
            ],
        ]));

        $this->expectExceptionObject($exception);

        $manager->emit(EventManagerTestEvent::class, new EventManagerTestPayload());
    }

    /**
     * Test that a container entry not implementing the listener contract fails clearly.
     */
    public function testEmitRejectsResolvedObjectsThatAreNotListeners(): void
    {
        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->once())->method('get')->with(EventManagerTestFirstListener::class)
            ->willReturn(new \stdClass());
        $manager = new EventManager($container, new EventRegistry([
            EventManagerTestEvent::class => [
                'payload' => EventManagerTestPayload::class,
                'listeners' => [EventManagerTestFirstListener::class],
            ],
        ]));

        $this->expectException(UnexpectedValueException::class);
        $this->expectExceptionMessage(EventListener::class);

        $manager->emit(EventManagerTestEvent::class, new EventManagerTestPayload());
    }
}

/**
 * Marker event used by EventManager tests.
 */
class EventManagerTestEvent
{
}

/**
 * Payload used by EventManager tests.
 */
class EventManagerTestPayload
{
}

/**
 * Invalid payload used by EventManager tests.
 */
class EventManagerTestOtherPayload
{
}

/**
 * Listener class name used to verify class-keyed container lookup.
 */
class EventManagerTestFirstListener implements EventListener
{

    /**
     * Handle the test payload.
     *
     * @param object $payload The payload to handle.
     */
    public function handle(object $payload): void
    {
    }
}

/**
 * Second listener class name used to verify dispatch order.
 */
class EventManagerTestSecondListener implements EventListener
{

    /**
     * Handle the test payload.
     *
     * @param object $payload The payload to handle.
     */
    public function handle(object $payload): void
    {
    }
}