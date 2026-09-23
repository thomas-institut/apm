<?php

namespace APM\System\User;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\InvalidObjectException;
use APM\EntitySystem\Exception\InvalidStatementException;
use APM\EntitySystem\Exception\InvalidSubjectException;
use APM\EntitySystem\Schema\Entity;
use APM\EntitySystem\ValueToolBox;
use APM\System\Person\PersonManagerInterface;
use APM\System\Person\PersonNotFoundException;
use RuntimeException;

readonly class UserEntityDataUpdater
{


    public function __construct(
        private ApmEntitySystemInterface $entitySystem,
        private PersonManagerInterface   $personManager,
        private UserManagerInterface     $userManager,
        private int                      $authorTid = Entity::System)
    {

    }

    /**
     * Makes or updates statements with user-related predicates:
     *   - Entity::pIsUser
     *   - Entity::pIsEnabledUser
     *
     * Returns an array of strings with information about changes made
     *
     * @param int $personTid
     * @param bool $hotRun
     * @return array
     * @throws PersonNotFoundException
     * @throws InvalidObjectException
     * @throws InvalidStatementException
     * @throws InvalidSubjectException
     */
    public function updateUserEntityData(int $personTid, bool $hotRun = false): array
    {

        $pm = $this->personManager;
        $es = $this->entitySystem;

        $currentEntityData = $pm->getPersonEntityData($personTid);
        $currentEssentialData = $pm->getPersonEssentialData($personTid);

        $isUser = $currentEssentialData->isUser;
        $currentIsUserValue = $currentEntityData->getObjectForPredicate(Entity::pIsUser);

        $info = [];

        if ($currentIsUserValue === null || ValueToolBox::valueToBool($currentIsUserValue) !== $isUser) {
            $info[] = "isUser: $isUser";
            if ($hotRun) {
                $es->makeStatement(
                    $personTid, Entity::pIsUser, ValueToolBox::boolToValue($isUser),
                    $this->authorTid, "Automatically updated by system"
                );
            }
        }

        if ($isUser) {
            try {
                $isEnabled = $this->userManager->isEnabled($personTid);
            } catch (UserNotFoundException) {
                // should never happen
                throw new RuntimeException("User $personTid reported as user, not then not found by UserManager");
            }
        } else {
            $isEnabled = false;
        }

        $currentIsUserEnabledValue = $currentEntityData->getObjectForPredicate(Entity::pIsEnabledUser);
        if ($currentIsUserEnabledValue === null || ValueToolBox::valueToBool($currentIsUserEnabledValue) !== $isEnabled) {
            $info[] = "isEnabledUser: $isEnabled";
            if ($hotRun) {
                $es->makeStatement(
                    $personTid, Entity::pIsEnabledUser, ValueToolBox::boolToValue($isEnabled),
                    $this->authorTid, "Automatically updated by system"
                );
            }
        }

        return $info;
    }


}