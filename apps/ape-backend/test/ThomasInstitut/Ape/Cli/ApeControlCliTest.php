<?php

namespace ThomasInstitut\Ape\Cli;

use DI\Container;
use DI\DependencyException;
use PHPUnit\Framework\TestCase;

/**
 * @covers \ThomasInstitut\Ape\Cli\ApeControlCli
 */
class ApeControlCliTest extends TestCase
{
    /**
     * Tests that run() prints usage and returns 1 when no command is given.
     */
    public function testRunPrintsUsageWhenNoCommandIsGiven(): void
    {
        $cli = $this->createCli($this->createStub(Container::class), [
            'dummy' => SuccessfulCliCommand::class,
        ]);

        $output = $this->captureOutput(static fn() => $cli->run(1, ['apectl']));

        $this->assertSame(1, $output['result']);
        $this->assertStringContainsString('Usage: apectl <command> [<args>]', $output['stdout']);
        $this->assertStringContainsString('Available commands:', $output['stdout']);
        $this->assertStringContainsString('dummy: Successful command', $output['stdout']);
    }

    /**
     * Tests that run() prints usage and returns 0 for the help command.
     */
    public function testRunPrintsUsageForHelpCommand(): void
    {
        $cli = $this->createCli($this->createStub(Container::class), [
            'dummy' => SuccessfulCliCommand::class,
        ]);

        $output = $this->captureOutput(static fn() => $cli->run(2, ['apectl', 'help']));

        $this->assertSame(0, $output['result']);
        $this->assertStringContainsString('Usage: apectl <command> [<args>]', $output['stdout']);
        $this->assertStringContainsString('dummy: Successful command', $output['stdout']);
    }

    /**
     * Tests that run() rejects an unknown command name.
     */
    public function testRunReturnsOneForUnknownCommand(): void
    {
        $cli = $this->createCli($this->createStub(Container::class), [
            'dummy' => SuccessfulCliCommand::class,
        ]);

        $output = $this->captureOutput(static fn() => $cli->run(2, ['apectl', 'missing']));

        $this->assertSame(1, $output['result']);
        $this->assertStringContainsString('Unknown command: missing', $output['stdout']);
    }

    /**
     * Tests that run() rejects resolved services that do not implement CommandInterface.
     */
    public function testRunReturnsOneWhenResolvedServiceIsNotACommand(): void
    {
        $container = $this->createMock(Container::class);
        $container->expects($this->once())
            ->method('get')
            ->with(InvalidCliService::class)
            ->willReturn(new InvalidCliService());

        $cli = $this->createCli($container, [
            'invalid' => InvalidCliService::class,
        ]);

        $output = $this->captureOutput(static fn() => $cli->run(2, ['apectl', 'invalid']));

        $this->assertSame(1, $output['result']);
        $this->assertStringContainsString('Error: Command invalid is not a CommandInterface', $output['stdout']);
    }

    /**
     * Tests that run() prints the command error and usage when the command requests it.
     */
    public function testRunPrintsUsageWhenCommandFailsAndRequestsUsage(): void
    {
        $container = $this->createMock(Container::class);
        $container->expects($this->once())
            ->method('get')
            ->with(FailingUsageCliCommand::class)
            ->willReturn(new FailingUsageCliCommand());

        $cli = $this->createCli($container, [
            'failing' => FailingUsageCliCommand::class,
        ]);

        $output = $this->captureOutput(static fn() => $cli->run(2, ['apectl', 'failing']));

        $this->assertSame(1, $output['result']);
        $this->assertStringContainsString('Error: failing on purpose', $output['stdout']);
        $this->assertStringContainsString('Usage: apectl <command> [<args>]', $output['stdout']);
        $this->assertStringContainsString('failing: Command that fails and requests usage', $output['stdout']);
    }

    /**
     * Tests that run() returns 0 when the resolved command succeeds.
     */
    public function testRunReturnsZeroWhenCommandSucceeds(): void
    {
        $container = $this->createMock(Container::class);
        $container->expects($this->once())
            ->method('get')
            ->with(SuccessfulCliCommand::class)
            ->willReturn(new SuccessfulCliCommand());

        $cli = $this->createCli($container, [
            'dummy' => SuccessfulCliCommand::class,
        ]);

        $output = $this->captureOutput(static fn() => $cli->run(2, ['apectl', 'dummy']));

        $this->assertSame(0, $output['result']);
        $this->assertSame('', $output['stdout']);
    }

    /**
     * Tests that run() prints an error message when container resolution fails.
     */
    public function testRunPrintsErrorWhenContainerResolutionFails(): void
    {
        $container = $this->createMock(Container::class);
        $container->expects($this->once())
            ->method('get')
            ->with(SuccessfulCliCommand::class)
            ->willThrowException(new DependencyException('boom'));

        $cli = $this->createCli($container, [
            'dummy' => SuccessfulCliCommand::class,
        ]);

        $output = $this->captureOutput(static fn() => $cli->run(2, ['apectl', 'dummy']));

        $this->assertSame(0, $output['result']);
        $this->assertStringContainsString('Error: Command dummy failed to run', $output['stdout']);
    }

    /**
     * Creates an ApeControlCli instance without invoking its constructor.
     *
     * @param array<string, class-string> $commands
     */
    private function createCli(Container $container, array $commands): ApeControlCli
    {
        $reflection = new \ReflectionClass(ApeControlCli::class);
        $cli = $reflection->newInstanceWithoutConstructor();

        $this->setPrivateProperty($cli, 'container', $container);
        $this->setPrivateProperty($cli, 'commands', $commands);
        $this->setPrivateProperty($cli, 'scriptName', 'apectl');

        return $cli;
    }

    /**
     * Sets a private property on the given object using reflection.
     * @throws \ReflectionException
     */
    private function setPrivateProperty(object $object, string $propertyName, mixed $value): void
    {
        $property = new \ReflectionProperty($object, $propertyName);
//        $property->setAccessible(true);
        $property->setValue($object, $value);
    }

    /**
     * Captures stdout and the return value of a callback.
     *
     * @param callable(): int $callback
     * @return array{result:int,stdout:string}
     */
    private function captureOutput(callable $callback): array
    {
        ob_start();
        $result = $callback();
        $stdout = ob_get_clean();

        return [
            'result' => $result,
            'stdout' => $stdout,
        ];
    }
}

/**
 * Test command that succeeds.
 */
class SuccessfulCliCommand implements CommandInterface
{
    /**
     * Returns a successful command result.
     */
    public function run(int $argc, array $argv): CommandResult
    {
        return new CommandResult(true);
    }

    /**
     * Returns the command description.
     */
    public static function getDescription(): string
    {
        return 'Successful command';
    }

    /**
     * Returns the command usage lines.
     *
     * @return array<int, string>
     */
    public static function getUsage(): array
    {
        return ['dummy'];
    }
}

/**
 * Test command that fails and requests usage output.
 */
class FailingUsageCliCommand implements CommandInterface
{
    /**
     * Returns a failing command result that requests usage output.
     */
    public function run(int $argc, array $argv): CommandResult
    {
        return new CommandResult(false, 'failing on purpose', true);
    }

    /**
     * Returns the command description.
     */
    public static function getDescription(): string
    {
        return 'Command that fails and requests usage';
    }

    /**
     * Returns the command usage lines.
     *
     * @return array<int, string>
     */
    public static function getUsage(): array
    {
        return ['failing'];
    }
}

/**
 * Test service that intentionally does not implement CommandInterface.
 */
class InvalidCliService
{
    /**
     * Returns the service description.
     */
    public static function getDescription(): string
    {
        return 'Invalid service';
    }
}
