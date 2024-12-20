<?php

/* 
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *  
 */

namespace APM\CommandLine;

use APM\EntitySystem\Schema\Entity;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;

/**
 * Description of ChangePasswordUtility
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

class InitDoc extends CommandLineUtility {
    
    const USAGE = "usage: initdoc <docId> <numPages> <colsPerPage>\n";
    
    public function main($argc, $argv): bool
    {
        if ($argc != 4) {
            print self::USAGE;
            return false;
        }

        $docId = (int) $argv[1];
        $numPages = (int) $argv[2];
        $colsPerPage = (int) $argv[3];
        
        if ($docId === 0) {
            $this->printErrorMsg('Wrong Doc Id');
            return false;
        }
        
        if ($numPages <= 0) {
            $this->printErrorMsg('Wrong num Pages');
            return false;
        }
        
        if ($colsPerPage < 0) {
            $this->printErrorMsg('Wrong cols per page');
            return false;
        }

        $docManager = $this->getSystemManager()->getDocumentManager();

        try {
            $docEntityData = $docManager->getDocumentEntityData($docId);
        } catch (DocumentNotFoundException) {
            $this->printErrorMsg("DocId $docId does not exist");
            return false;
        }
        $docTitle = $docEntityData->name;
        $docLang = $docEntityData->getObjectForPredicate(Entity::pDocumentLanguage) ?? Entity::LangArabic;

        print "Creating $numPages pages for doc Id $docId ($docTitle)...\n";
        for ($i = 0; $i < $numPages; $i++) {
            $pageExists = true;
            try {
               $docManager->getPageIdByDocPage($docId, $i + 1);
            } catch (DocumentNotFoundException) {
                // should never happen
                $this->printErrorMsg("ERROR: DocumentNotFoundException when getting page number " . ($i + 1));
                return false;
            } catch (PageNotFoundException) {
                $pageExists = false;
            }
            if ($pageExists) {
                $this->printWarningMsg("Page " . ($i+1) . " already exists, skipping.");
                continue;
            }
            try {
                $newPageId = $docManager->createPage($docId, $i + 1, $docLang);
            } catch (DocumentNotFoundException) {
                // should never happen
                $this->printErrorMsg("ERROR: DocumentNotFoundException when creating page number " . ($i + 1));
                return false;
            }

            for ($j = 0; $j < $colsPerPage; $j++) {
                try {
                    $docManager->addColumn($newPageId);
                } catch (PageNotFoundException) {
                    // should never happen
                    $this->printErrorMsg("ERROR: PageNotFoundException when add column to page number " . ($i + 1) . " pageId $newPageId");
                    return false;
                }
            }
        }
        print "Done.\n";
        return true;
    }
    
}