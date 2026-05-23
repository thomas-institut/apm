<?php

namespace ThomasInstitut\Ape\Cli;

use DI\Container;
use DI\DependencyException;
use DI\NotFoundException;
use ThomasInstitut\Ape\Managers\ApmCommunicationProblemException;
use ThomasInstitut\Ape\Managers\PublicationManager;
use ThomasInstitut\Ape\Managers\PublicationNotFoundException;

readonly class PublicationCliCommand implements CommandInterface
{
    public function __construct(private Container $container)
    {
    }

    public function run(int $argc, array $argv): CommandResult
    {
        if ($argc === 0) {
            return new CommandResult(false, "No command given", true);
        }
        $command = $argv[0];
        return match ($command) {
            'list' => $this->list(),
            'get' => $this->get($argv[1] ?? null),
            'update' => $this->update(),
            default => new CommandResult(false, "Invalid command", true),
        };
    }

    private function list(): CommandResult
    {
        try {
            /** @var PublicationManager $manager */
            $manager = $this->container->get(PublicationManager::class);
            $publications = $manager->getPublicationListings();
            if (count($publications) === 0) {
                print "No publications found\n";
                return new CommandResult(true);
            }
            foreach ($publications as $index => $publication) {
                printf("%2d: %4d %s %s\n", $index + 1, $publication->id, $publication->type, $publication->title);
            }
            return new CommandResult(true);
        } catch (DependencyException | NotFoundException) {
            return new CommandResult(false, "Publication manager not available");
        }
    }

    private function get(?string $idArg): CommandResult
    {
        if ($idArg === null) {
            return new CommandResult(false, "No publication id given", true);
        }
        if (!is_numeric($idArg)) {
            return new CommandResult(false, "Invalid publication id", true);
        }
        $id = intval($idArg);
        try {
            /** @var PublicationManager $manager */
            $manager = $this->container->get(PublicationManager::class);
            $publicationData = $manager->getPublicationData($id);
            print_r($publicationData);
            return new CommandResult(true);
        } catch (DependencyException | NotFoundException) {
            return new CommandResult(false, "Publication manager not available", true);
        } catch (PublicationNotFoundException) {
            return new CommandResult(false, "Publication not found");
        }
    }

    private function update(): CommandResult
    {
        try {
            /** @var PublicationManager $manager */
            $manager = $this->container->get(PublicationManager::class);
            $manager->updateFromApm();
            print "Successfully updated from APM\n";
            return new CommandResult(true);
        } catch (DependencyException | NotFoundException) {
            return new CommandResult(false, "Publication manager not available");
        } catch (ApmCommunicationProblemException $e) {
            return new CommandResult(false, "Communication problem with APM: " . $e->getMessage());
        }
    }

    public static function getUsage(): array
    {
        return [
            "list: returns all available publications",
            "get <id>: returns publication data for given id",
            "update: updates publications from APM"
        ];
    }

    public static function getDescription(): string
    {
        return "Manages publications";
    }
}
