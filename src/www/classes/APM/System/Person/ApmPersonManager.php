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
            $personData = $this->getPersonDataFromDataTableRow($rows[0]);
            if ($personData->isUser) {
                try {
                    $userData = $this->userManager->getUserData($personTid);
                } catch (UserNotFoundException) {
                    // this should never happen, but should not cause a major failure
                    $this->logger->error("User data not found for user $personTid");
                }
                $personData->userName = $userData->userName ?? '';
            }
            $this->cache[$personTid] = $personData;
        }
        return $this->cache[$personTid];
    }

    private function getPersonDataFromDataTableRow(array $row) : PersonEssentialData {
        $data = new PersonEssentialData();

        $data->id = intval($row['id']);
        $data->tid = intval($row['tid']);
        $data->name = $row['fullname'];
        $data->sortName = $row['sort_name'] ?? $data->name;
        $data->isUser = intval($row['isApmUser']) === 1;
        $email = $row['email'] ?? '';
        if ($email !== '') {
            $data->extraAttributes = [
                'email' => $email
            ];
        }
        return $data;
    }

    /**
     * @inheritDoc
     */
    public function newPerson(string $name, string $sortName, bool $isUser = false): int
    {
        if ($name === '') {
            throw  new InvalidPersonNameException();
        }

        $tid = Tid::generateUnique();

        $this->personsTable->createRow([ 'tid' => $tid,  'fullname' => $name, 'isApmUser' => $isUser]);
        return $tid;
    }
}