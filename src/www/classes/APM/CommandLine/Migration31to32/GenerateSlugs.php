<?php

namespace APM\CommandLine\Migration31to32;

use APM\CommandLine\CommandLineUtility;
use APM\System\ApmMySqlTableName;
use APM\ToolBox\FullName;
use DateTime;
use ThomasInstitut\DataTable\InvalidRowForUpdate;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\RowDoesNotExist;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\TimeString\InvalidTimeZoneException;
use Transliterator;

class GenerateSlugs extends CommandLineUtility
{


    const conversionTable = [
        'Ö' => 'o',
        'ā' => 'a',
        'ǧ' => 'j',
        'á' => 'a'
        ];


    /**
     * @throws RowDoesNotExist
     * @throws InvalidRowForUpdate
     */
    public function main($argc, $argv): void
    {



        $doIt = ($argv[1] ?? '') === 'doIt';

        $dbConn = $this->getSystemManager()->getDbConnection();

        $tableName = $this->getSystemManager()->getTableNames()[ApmMySqlTableName::TABLE_PEOPLE];

        $dt = new MySqlDataTable($dbConn, $tableName);

        // fill up current slugs
//        $currentSlugs = [];
//        foreach($dt->getAllRows() as $row) {
//            if ($row['slug'] !== null) {
//                $currentSlugs[] = $row['slug'];
//            }
//        }


        $dt->startTransaction();
        foreach ($dt->getAllRows() as $row) {
            $rowForUpdate = [ 'id' => $row['id']];
            $name = $row['name'];

            print "$name: \n";

            if ($row['sort_name'] === null) {
                $sortName = $this->generateSortName($name);
                print "  ** generated sort name: '$sortName'\n";
                $rowForUpdate['sort_name'] = $sortName;
            } else {
                $sortName = $row['sort_name'];
                print "  sort name is already set: '$sortName'\n";
            }
//            if ($row['slug'] === null) {
//                // generate slug
//                $slug = $this->generateSlug($row['name']);
//                $originalSlug = $slug;
//                if (in_array($slug, $currentSlugs)) {
//                    $i = 1;
//                    while (in_array($slug, $currentSlugs)) {
//                        $slug = $originalSlug . '_' . ++$i;
//                    }
//                } else {
//                    $currentSlugs[] = $slug;
//                }
//                print"  ** generated slug: '$slug'\n";
//                $rowForUpdate['slug'] = $slug;
//            } else {
//                $slug = $row['slug'];
//                print "  slug is already set: '$slug'\n";
//            }

            if (count(array_keys($rowForUpdate)) > 1) {
                // we need to update
                $dt->updateRow($rowForUpdate);
            }
        }

        if ($doIt) {
            $dt->commit();
        } else {
            $dt->rollBack();
        }
    }
//    private function generateSlug(string $name) : string {
//        $slug = iconv('UTF-8', 'US-ASCII//TRANSLIT', $name);
//        return str_replace(' ', '_', $slug);
//    }

    private function generateSortName(string $name) : string
    {
        $name = iconv('UTF-8', 'US-ASCII//TRANSLIT', $name);
        $fullName = FullName::analyze($name);
        $sortName = implode(' ', $fullName['lastNames']);
        if (count($fullName['firstNames']) > 0) {
            $sortName .= ', ';
            $sortName .= implode(' ', $fullName['firstNames']);
        }
        return $sortName;
    }



}