<?php

namespace ThomasInstitut\Ape\Cli;

use DI\Container;
use DI\DependencyException;
use DI\NotFoundException;
use GuzzleHttp\Exception\GuzzleException;
use ThomasInstitut\ApmPublicationApi\PublicationApiClient;
use ThomasInstitut\StandardApi\ErrorResponse;

readonly class QueryApmCliCommand implements CommandInterface
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
            default => new CommandResult(false, "Invalid command", true),
        };
    }

    private function list(): CommandResult
    {
        try {
            $client = $this->container->get(PublicationApiClient::class);
            $apiResponse = $client->list();
            if ($apiResponse instanceof ErrorResponse) {
                return new CommandResult(false, "Error querying APM: " . $apiResponse->message);
            }

            if (count($apiResponse->publications) === 0) {
                print "No publications found\n";
                return new CommandResult(true);
            }

            foreach ($apiResponse->publications as $index => $publication) {
                printf("%2d: %4d %s %s\n", $index+1, $publication->id, $publication->type, $publication->title);
            }
            return new CommandResult(true);

        } catch (DependencyException|NotFoundException) {
            return new CommandResult(false, "APM client not available");
        } catch (GuzzleException $e) {
            return new CommandResult(false, "Error querying APM: " . $e->getMessage());
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
            $client = $this->container->get(PublicationApiClient::class);
            $apiResponse = $client->get($id);
            if ($apiResponse instanceof ErrorResponse) {
                return new CommandResult(false, "Error querying APM: " . $apiResponse->message);
            }
            print_r($apiResponse->publicationData);
            return new CommandResult(true);
        } catch (DependencyException|NotFoundException) {
            return new CommandResult(false, "APM client not available", true);
        } catch (GuzzleException $e) {
            return new CommandResult(false, "Error querying APM: " . $e->getMessage());
        }
    }

    public static function getUsage(): array
    {
        return ["list: returns all available publications in APM", "get <id>: returns publication with given id"];
    }

    public static function getDescription(): string
    {
        return "Queries publications from APM";
    }
}