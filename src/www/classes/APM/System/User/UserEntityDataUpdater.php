<?php

namespace APM\System\User;

use APM\EntitySystem\Schema\Entity;
use APM\EntitySystem\ValueToolBox;
use APM\System\Person\PersonNotFoundException;
use APM\System\SystemManager;
use RuntimeException;

class UserEntityDataUpdater
{

    private SystemManager $systemManager;
    private int $authorTid;

    public function __construct(SystemManager $systemManager, int $authorTid = Entity::System)
    {
        $this->systemManager = $systemManager;
        $this->authorTid = $authorTid;
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
     */
    public function updateUserEntityData(int $personTid, bool $hotRun = false) : array {

        $pm = $this->systemManager->getPersonManager();
        $es = $this->systemManager->getEntitySystem();

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
                $isEnabled = $this->systemManager->getUserManager()->isEnabled($personTid);
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