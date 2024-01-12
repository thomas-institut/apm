<?php

namespace APM\System\Person;

use APM\System\User\UserManagerInterface;
use APM\System\User\UserNotFoundException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\EntitySystem\Tid;

/**
 * Implementation of a person manager with ap_people data table
 *
 * This will be replaced eventually/soon with EntitySystem methods
 */
class ApmPersonManager implements PersonManagerInterface, LoggerAwareInterface
{

    use LoggerAwareTrait;

    private DataTable $personsTable;
    private array $cache;
    private UserManagerInterface $userManager;

    public function __construct(DataTable $personsTable, UserManagerInterface $userManager)
    {
        $this->personsTable = $personsTable;
        $this->userManager = $userManager;
        $this->cache = [];
    }

    /**
     * @inheritDoc
     */
    public function getPersonEssentialData(int $personTid): PersonEssentialData
    {
        if ($personTid <= 0) {
            throw new PersonNotFoundException();
        }
        if (!isset($this->cache[$personTid])) {
            $rows = $this->personsTable->findRows(['tid' => $personTid]);
            if (count($rows) === 0) {
                throw new PersonNotFoundException();
            }
            $personData = $this->buildPersonEssentialDataFromRow($rows[0]);
            $this->cache[$personTid] = $personData;
        }
        return $this->cache[$personTid];
    }

    private function buildPersonEssentialDataFromRow(array $row): PersonEssentialData
    {
        $personData = $this->getPersonDataFromPeopleTableRow($row);
        $personTid = intval($row['tid']);
        $personData->isUser = false;
        if ($this->userManager->isUser($personTid)) {
            try {
                $userData = $this->userManager->getUserData($personTid);
            } catch (UserNotFoundException) {
                // should never happen, but should not break things too much
                $this->logger->error("User data not found for tid $personTid");
            }
            $personData->isUser = true;
            $personData->userName = $userData->userName ?? '';
            $personData->userTags = $userData->tags ?? [];
            $personData->userEmailAddress = $userData->emailAddress ?? '';
        }
        return $personData;
    }

    private function getPersonDataFromPeopleTableRow(array $row) : PersonEssentialData {
        $data = new PersonEssentialData();

        $data->id = intval($row['id']);
        $data->tid = intval($row['tid']);
        $data->name = $row['name'];
        $data->sortName = $row['sort_name'] ?? $data->name;
        $data->extraAttributes = [];
        $data->isUser = false;
        $data->userName = '';
        $data->userTags = [];
        $data->userEmailAddress = '';
        return $data;
    }

    /**
     * @inheritDoc
     */
    public function createPerson(string $name, string $sortName): int
    {
        if ($name === '') {
            throw  new InvalidPersonNameException();
        }

        $tid = Tid::generateUnique();

        $this->personsTable->createRow([ 'tid' => $tid,  'name' => $name]);
        return $tid;
    }

    /**
     * @inheritDoc
     */
    public function getAllPeopleEssentialData(): array
    {
        $rows = $this->personsTable->getAllRows();
        $personDataArray = [];
        foreach ($rows as $row) {
            $personTid = intval($row['tid']);
            $personData = $this->buildPersonEssentialDataFromRow($row);
            $this->cache[$personTid] = $personData;
            $personDataArray[] = $personData;
        }
        return $personDataArray;
    }


    /**
     * @inheritDoc
     */
    public function getAllPeopleTids(): array
    {
        $rows = $this->personsTable->getAllRows();
        $tids = [];
        foreach ($rows as $row) {
            $tids[] = intval($row['tid']);
        }
        return $tids;
    }
}