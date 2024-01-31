<?php

namespace APM\CommandLine;

use APM\System\Person\InvalidPersonNameException;
use APM\System\User\InvalidEmailAddressException;
use APM\System\User\InvalidPasswordException;
use APM\System\User\InvalidUserNameException;
use APM\System\User\UserNameAlreadyInUseException;
use APM\System\User\UserNotFoundException;
use APM\System\User\UserTag;
use ThomasInstitut\EntitySystem\Tid;

class UserTool extends CommandLineUtility implements AdminUtility
{

    const CMD = 'user';

    const USAGE = self::CMD . " <option> [<username>]\n\n" .
       "Options:\n  list: list all users\n  create: creates a new user\n" .
       "  makeRoot: make a user root\n  changePassword: changes a user's password\n  disable: disables a user\n" .
       "  enable: enables a user";
    const DESCRIPTION = "User management functions";


    public function getCommand(): string
    {
        return self::CMD;
    }

    public function getHelp(): string
    {
        return self::USAGE;
    }

    public function getDescription(): string
    {
        return self::DESCRIPTION;
    }

    public function main($argc, $argv): int
    {
        if ($argc === 1) {
            print self::USAGE . "\n";
            return 0;
        }

        switch($argv[1]) {
            case 'list':
                $this->listUsers();
                break;

            case 'create':
                $this->createNewUser();
                break;

            case 'changePassword':
                $this->changePassword();
                break;

            case 'disable':
                $this->enableDisableUser(true);
                break;

            case 'enable':
                $this->enableDisableUser(false);
                break;

            case 'makeRoot':
                $this->makeRoot();
                break;

            default:
                print "Unrecognized option: "  . $argv[1] ."\n";
                return 0;
        }
        return 1;
    }

    private function changePassword()
    {
        if ($this->argc < 3) {
            print "Please enter a userName\n";
            return;
        }

        $userName = $this->argv[2];
        $um = $this->getSystemManager()->getUserManager();

        $userTid = $um->getUserTidForUserName($userName);

        if ($userTid === -1) {
            print "$userName is not a user in the system\n";
            return;
        }

        try {
            if (!$um->isEnabled($userTid)) {
                print "$userName is currently disabled, enable them first before setting their password\n";
                return;
            }
            print "Password: ";
            system('stty -echo');
            $password1 = trim(fgets(STDIN));
            system('stty echo');
            print "\n";
            print "Type password again: ";
            system('stty -echo');
            $password2 = trim(fgets(STDIN));
            system('stty echo');
            print "\n";
            if ($password1 !== $password2) {
                print "Passwords do not match\n";
                return;
            }
            $um->changePassword($userTid, $password1);
            print "Password successfully set\n";
        } catch (InvalidPasswordException) {
            print "Invalid password\n";
        } catch (UserNotFoundException) {
            print "Error trying to set password for user $userName\n";
        }
    }




    private function listUsers() : void {

        $um = $this->getSystemManager()->getUserManager();
        $allUsersData = $um->getAllUsersData();

        foreach($allUsersData as $userData) {
            printf("%-15s   %s   %d   %s\n",
                $userData->userName, Tid::toBase36String($userData->tid),
                $userData->tid, implode(', ', $userData->tags));
        }

    }

    private function createNewUser() : void
    {
        if ($this->argc < 3) {
            print "Please enter a userName\n";
            return;
        }

        $um = $this->getSystemManager()->getUserManager();
        $personManager = $this->getSystemManager()->getPersonManager();
        $userName = $this->argv[2];

        if (!$um->isStringValidUserName($userName)) {
            print "The given username '$userName' is not a valid userName\n";
            return;
        }


        print "This command is meant for adding the first users on a brand new system or for emergencies.\n";
        print "If this is not the case, you should use the web interface.\n";
        print "Be prepared to enter a valid name and email address for the new user\n";
        print "Are you sure you want to continue? Type yes or no: ";
        $answer = trim(fgets(STDIN));

        if (strtolower($answer) !== 'yes') {
            print "OK, no harm done.\n";
            return;
        }

        print "Enter the new user's name (e.g. Jon Snow): ";
        $name = trim(fgets(STDIN));

        print "Enter the new user's sort name (e.g. Snow, Jon): ";
        $sortName = trim(fgets(STDIN));

        print "Enter the new user's email address (or leave it blank): ";
        $emailAddress = trim(fgets(STDIN));



        print "About to create new user with the following data:\n";
        print "  Username: $userName\n  Name: $name\n  Sort Name: $sortName\n  Email: $emailAddress\n";
        print "Is this correct? Type yes or no: ";
        $answer = trim(fgets(STDIN));

        if (strtolower($answer) !== 'yes') {
            print "No problem, nothing done.\n";
            return;
        }

        try {
            $newUserTid = $personManager->createPerson($name, $sortName);
        } catch (InvalidPersonNameException) {
            print "ERROR: The given name for the new user is not valid: '$name'\n";
            return;
        }

        try {
            $um->createUser($newUserTid, $userName);
            if ($emailAddress !== '') {
                $um->changeEmailAddress($newUserTid, $emailAddress);
            }
        } catch (InvalidUserNameException) {
            print "The given username for the new user is not valid: '$userName'\n";
            return;
        } catch (UserNameAlreadyInUseException) {
            print "The given username for the new user is already in use: '$userName'\n";
            return;
        } catch (InvalidEmailAddressException $e) {
            print "The given email address for the new user not valid: '$emailAddress'\n";
            return;
        } catch (UserNotFoundException $e) {
            print "ERROR creating user\n";
            return;
        }

        print "User $userName created with tid $newUserTid. You should now set a new password for them\n";
    }

    private function enableDisableUser(bool $disable): void{
        if ($this->argc < 3) {
            print "Please enter a userName\n";
            return;
        }

        $userName = $this->argv[2];
        $um = $this->getSystemManager()->getUserManager();

        $userTid = $um->getUserTidForUserName($userName);

        if ($userTid === -1) {
            print "$userName is not a user in the system\n";
            return;
        }

        try {
            if ($um->isEnabled($userTid)) {
                if ($disable) {
                    $um->disableUser($userTid);
                    print "User $userName is now disabled\n";
                } else {
                    print "User $userName is already enabled\n";
                }
            } else {
                if ($disable) {
                    print "$userName is already disabled\n";
                } else {
                    $um->removeTag($userTid, UserTag::DISABLED);
                    print "$userName is now enabled, you must set a new password for them before they can log into the system\n";
                }
            }
        } catch (UserNotFoundException) {
            print "Error trying to change enabled status for user $userName\n";
        }
    }

    private function makeRoot() : void {

        if ($this->argc < 3) {
            print "Please enter a userName to make root\n";
            return;
        }

        $userName = $this->argv[2];
        $um = $this->getSystemManager()->getUserManager();

        $userTid = $um->getUserTidForUserName($userName);

        if ($userTid === -1) {
            print "$userName is not a user in the system\n";
            return;
        }

        try {
            if ($um->isRoot($userTid)) {
                print "$userName is already root\n";
            } else {
                $um->addTag($userTid, UserTag::ROOT);
                print "User $userName is now root\n";
            }
        } catch (UserNotFoundException) {
            print "Error trying to make $userName root\n";
        }
    }
}