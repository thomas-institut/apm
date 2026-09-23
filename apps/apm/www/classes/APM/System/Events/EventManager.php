<?php

namespace APM\System\Events;

use InvalidArgumentException;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use UnexpectedValueException;

final readonly class EventManager
{

    /**
     * Create an event dispatcher backed by the application container and registry.
     *
     * @param ContainerInterface $container Resolves listener instances by class name.
     * @param EventRegistry $eventRegistry Declares event payload types and ordered listeners.
     */
    public function __construct(
        private ContainerInterface $container,
        private EventRegistry      $eventRegistry
    ) {
    }

    /**
     * Synchronously dispatch a payload to all listeners registered for an event.
     *
     * @param string $eventClass The event marker class name.
     * @param object $payload The caller-created event payload.
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function emit(string $eventClass, object $payload): void
    {
        $registration = $this->eventRegistry->getRegistration($eventClass);
        if ($registration === null) {
            throw new InvalidArgumentException(sprintf('Event "%s" is not registered.', $eventClass));
        }

        if (!is_a($payload, $registration['payload'])) {
            throw new InvalidArgumentException(sprintf(
                'Payload for event "%s" must be an instance of "%s"; "%s" given.',
                $eventClass,
                $registration['payload'],
                $payload::class
            ));
        }

        foreach ($registration['listeners'] as $listenerClass) {
            $listener = $this->container->get($listenerClass);
            if (!$listener instanceof EventListener) {
                throw new UnexpectedValueException(sprintf(
                    'Listener "%s" must implement %s.',
                    $listenerClass,
                    EventListener::class
                ));
            }

            $listener->handle($payload);
        }
    }
}