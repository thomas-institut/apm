<?php

namespace ThomasInstitut\AuthService;

/**
 * A user's authorization credentials for a given system
 */
class AuthorizationContext
{
    public string $name;
    public bool $isEnabled;
    public array $actions;
    public array $roles;
    public array $groups;

    public function __construct()
    {
        $this->name = '';
        $this->isEnabled = false;
        $this->actions = [];
        $this->groups = [];
        $this->roles = [];
    }


    public function getActionsAllowed() : array {
        return $this->actions;
    }
    public function setActionsAllowed(array $actions) : void {
        $this->actions = $actions;
    }
    public function isUserAllowed(string $action) : bool {
        return in_array($action, $this->actions);
    }
    public function allowUser(string $action) : void {
       $this->addString($this->actions, $action);
    }
    public function disallowUser(string $action): void {
       $this->removeString($this->actions, $action);
    }


    public function hasRole(string $role) : bool {
        return in_array($role, $this->roles);
    }
    public function getRoles() : array {
        return $this->roles;
    }
    public function setRoles(array $roles) : void {
        $this->roles = $roles;
    }
    function addRole(string $role) : void {
        $this->addString($this->roles, $role);
    }
    public function takeRoleAway(string $role) : void {
        $this->removeString($this->roles, $role);
    }

    public function belongsToGroup(string $group) : bool{
        return in_array($group, $this->groups);
    }
    public function getGroups() : array {
        return $this->groups;
    }
    public function setGroups(array $groups) : void {
        $this->groups = $groups;
    }
    public function addToGroup(string $group) : void {
        $this->addString($this->groups, $group);
    }
    public function removeFromGroup(string $group) : void {
        $this->removeString($this->groups, $group);
    }

    private function addString(array &$theArray, string $theString) : void {
        if (!in_array($theString, $theArray)) {
            $theArray[] = $theString;
        }
    }

    private function removeString(array &$theArray, string $theString) : void {
        $index = array_search($theString, $theArray);
        if ($index !== false) {
            array_splice($theArray, $index, 1);
        }
    }


}