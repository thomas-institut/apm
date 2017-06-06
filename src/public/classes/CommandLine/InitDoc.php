<?php

/* 
 *  Copyright (C) 2017 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */

namespace AverroesProject\CommandLine;

use AverroesProject\Xml\TranscriptionReader;

/**
 * Description of ChangePasswordUtility
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

class InitDoc extends CommandLineUtility {
    
    const USAGE = "usage: initdoc <docId> <numPages> <colsPerPage>\n";
    
    public function main($argc, $argv)
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
        
        if ($colsPerPage <= 0) {
            $this->printErrorMsg('Wrong cols per page');
            return false;
        }
        
        $docInfo = $this->dm->getDocById($docId);
        
        if ($docInfo === false) {
            $this->printErrorMsg("Can't get doc info for docId $docId");
            return false;
        }
        
        print "Creating $numPages  pages for doc Id $docId (" . $docInfo['title'] . ")...\n";
        for ($i = 0; $i < $numPages; $i++) {
            $pageId = $this->dm->getPageIdByDocPage($docId, $i+1);
            if ($pageId !== false) {
                $this->printWarningMsg("Page " . ($i+1) . " already exists, skipping.");
                continue;
            }
            $pageId = $this->dm->newPage($docId, $i+1, $docInfo['lang']);
            if ($pageId === false) {
                $this->printErrorMsg("Can't create page " . ($i+1));
                return false;
            }
            for ($j = 0; $j < $colsPerPage; $j++) {
                $result = $this->dm->addNewColumn($docId, $i+1);
                if ($result === false) {
                    $this->printErrorMsg("Can't add column " . ($j+1) . " to page " . ($i+1));
                    return false;
                }
            }
        }
        print "Done.\n";
        return true;
    }
    
}