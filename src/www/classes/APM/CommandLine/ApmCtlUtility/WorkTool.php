<?php

namespace APM\CommandLine\ApmCtlUtility;

use APM\CommandLine\CommandLineUtility;
use APM\EntitySystem\Schema\Entity;
use APM\System\Person\PersonNotFoundException;
use APM\System\Work\WorkData;
use APM\System\Work\WorkNotFoundException;
use Exception;
use ThomasInstitut\EntitySystem\Tid;
use function Symfony\Component\String\b;

class WorkTool extends CommandLineUtility implements AdminUtility
{

    const string CMD = 'work';

    const string USAGE = self::CMD . " <option>\n\nOptions:\n" .
        " info <entity or APM id>: prints info about the given work\n" .
        " set-enable-flag <entity or APM id>: enables/disables a work for transcriptions\n" .
        " reset-cache <entity or APM id>: resets the cached data associated with a work\n" .
        " create: creates a new work\n";
    const string DESCRIPTION = "Work related functions";

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

    public function main($argc, $argv) : int
    {
        if ($argc === 1) {
            print self::USAGE . "\n";
            return 0;
        }

        switch(strtolower($argv[1])) {

            case 'info':
                if (!isset($argv[2])) {
                    print "Error: Need an entity id\n";
                    print self::USAGE . "\n";
                    return 0;
                }
                $this->printWorkInfo($argv[2]);
                break;


            case 'set-enable-flag':
                if (!isset($argv[3])) {
                    print "Error: Need an entity id and a new flag\n";
                    print self::USAGE . "\n";
                    return 0;
                }
                $this->setEnableFlag($argv[2], $argv[3]);
                break;

            case 'reset-cache':
                if (!isset($argv[2])) {
                    print "Error: Need an entity id\n";
                    print self::USAGE . "\n";
                    return 0;
                }
                $this->resetCache($argv[2]);
                break;

            case 'create':
                $this->createWork();
                break;

            default:
                print "Unrecognized option: "  . $argv[1] ."\n";
                return 0;
        }
        return 1;
    }


    private function userSaysYes() : bool {
        return strtolower(trim(fgets(STDIN))) === 'yes';
    }

    /**
     * @throws WorkNotFoundException
     */
    private function getWorkData(string $entityOrApmId) : WorkData {
        $wm = $this->getSystemManager()->getWorkManager();
        // first try as ApmId, which will surely be the most common case
        try {
            return $wm->getWorkDataByDareId($entityOrApmId);
        } catch (WorkNotFoundException) {
            // if not, try with entity id
            $id = Tid::fromString($entityOrApmId);
            return $wm->getWorkData($id);
        }
    }

    private function resetCache(string $entityOrApmId): void
    {
        try {
            $workData = $this->getWorkData($entityOrApmId);
        }  catch (WorkNotFoundException) {
            // no work!
            print "Work $entityOrApmId not found\n";
            return;
        }
        $this->getSystemManager()->onWorkUpdated($workData->entityId);

    }

    private function setEnableFlag(string $entityOrApmId, string $newFlag): void
    {
        $wm = $this->getSystemManager()->getWorkManager();
        $entityOrApmId = trim($entityOrApmId);
        $newFlag = trim($newFlag);
        if (!in_array($newFlag, ['1', '0'], true)) {
            print "ERROR: flag should be either '1' or '0'\n";
            return;
        }

        $boolNewFlag = $newFlag === '1';

        try {
            $workData = $this->getWorkData($entityOrApmId);
        }  catch (WorkNotFoundException) {
            // no work!
            print "Work $entityOrApmId not found\n";
            return;
        }

        if ($workData->enabled === $boolNewFlag) {
            if ($workData->enabled) {
                print "Work $workData->workId is already enabled, nothing to do\n";
            } else {
                print "Work $workData->workId is already disabled, nothing to do\n";
            }
            return;
        }
        try {
            $wm->setWorkEnableStatus($workData->entityId, $newFlag);
        } catch (WorkNotFoundException) {
            // should never happen!
            print "ERROR: Work $entityOrApmId not found\n";
        }
    }
    private function createWork() : void {

        print "Work Title: ";
        $title = fgets(STDIN);
        $title = trim($title);

        if ($title === '') {
            print "ERROR: title cannot be empty\n";
        }

        print "Author (entity id): ";
        $author = fgets(STDIN);
        $author = Tid::fromString(trim($author));


        try {
            $authorData = $this->getSystemManager()->getPersonManager()->getPersonEssentialData($author);
        } catch (PersonNotFoundException) {
            print "ERROR: author $author not found or not a person\n";
            return;
        }

        print "Author is '$authorData->name', is this right? Type 'yes' to confirm: ";
        if (!$this->userSaysYes()) {
            print "No problem, try again with the right author\n";
            return;
        }

        print "Short Title: ";
        $shortTitle = fgets(STDIN);
        $shortTitle = trim($shortTitle);
        if ($shortTitle === '') {
            print "ERROR: short title cannot be empty\n";
        }


        print "Apm/Dare Id (e.g. AW123): ";
        $dareId = fgets(STDIN);
        $dareId = trim($dareId);
        if ($dareId === '') {
            print "ERROR: dare id cannot be empty\n";
        }

        print "Enable in Transcription Editor? (yes/no): ";
        $enabled = $this->userSaysYes();

        $enabledLabel = $enabled ? 'yes' : 'no';

        print "Are you sure you want to create a new work?\n";
        print "  Author: $authorData->name\n";
        print "  Title: $title\n";
        print "  Short Title: $shortTitle\n";
        print "  APM/Dare Id: $dareId\n";
        print "  Enabled: $enabledLabel\n";
        print "Type 'yes' to confirm: ";
        if (!$this->userSaysYes()){
            print "OK, nothing done\n";
            return;
        }

        try {
            $workId = $this->getSystemManager()->getWorkManager()->createWork($title, $author, $dareId, $enabled, Entity::System);
        } catch (Exception $ex) {
            print "ERROR: Work creation failed: " .  $ex->getMessage() . "\n";
            return;
        }

        $this->getSystemManager()->onWorkAdded($workId);
        printf("New work created, id = %d = %s\n", $workId, Tid::toBase36String($workId));
    }

    /**
     */
    private function printWorkInfo(string $entityOrApmId) : void {

        $entityOrApmId = trim($entityOrApmId);

        try {
            $workData = $this->getWorkData($entityOrApmId);
        } catch (WorkNotFoundException) {
            // no work!
            print "Work $entityOrApmId not found\n";
            return;
        }

        try {
            $authorInfo = $this->getSystemManager()->getPersonManager()->getPersonEssentialData($workData->authorId);
        } catch (PersonNotFoundException) {
            // should never happen
            print "ERROR: author $workData->authorId not found\n";
            return;
        }

        print "Entity Id: $workData->entityId =" . Tid::toBase36String($workData->entityId) . "\n";
        print "APM Id: $workData->workId\n";
        print "Title: '$workData->title'\n";
        print "Short Title: '$workData->shortTitle'\n";
        print "Author: $authorInfo->name ($workData->authorId = " . Tid::toBase36String($workData->authorId) . ")\n";
        print "Enabled: " . ($workData->enabled ? 'yes' : 'no' ). "\n";

    }

}