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

class ImportXmlFile extends CommandLineUtility {
    
    const USAGE = "usage: importxmlfile <filename>\n";
    
    public function main($argc, $argv)
    {
        if ($argc != 2) {
            print self::USAGE;
            return false;
        }

        $filename = $argv[1];
        
        print ("Loading XML file...");
        $xml = file_get_contents($filename);
                
        if ($xml === false) {
            $msg = "Can't read file '$filename'";
            $this->printErrorMsg($msg);
            return false;
        }
        print "done\n";
        
        $tsReader = new TranscriptionReader();
        
        print ("Analyzing transcription...\n");
        $result = $tsReader->read($xml);
        
        if ($result === false) {
            $this->printErrorMsg("$tsReader->errorNumber: $tsReader->errorMsg : $tsReader->errorContext");
            return false;
        }
        
        foreach ($tsReader->warnings as $warning) {
            $this->printWarningMsg($warning['number'] . " : " . $warning['message'] . " : " . $warning['context']);
        }
        
        // Check editor
        print "Checking editor...\n";
        $editorUsername = $tsReader->transcription['people'][0];
        $editorUserId= $this->um->getUserIdFromUserName($editorUsername);
        if ($editorUserId === false) {
            $msg = "Username $editorUsername does not exist in the system";
            $this->printErrorMsg($msg);
            return false;
        }
        
        // Process pages
        print "Processing pages...\n";
        if (count($tsReader->transcription['pageDivs']) === 0) {
            $this->printErrorMsg('No pages found in transcription');
            return false;
        }
        foreach($tsReader->transcription['pageDivs'] as $pageDiv) {
            $fields = explode("-", $pageDiv['facs']);
            $pageNumber = (int) array_pop($fields);
            $docDareId = implode('-', $fields);
            $docInfo =  $this->dm->getDocByDareId($docDareId);
            if ($docInfo === false) {
                $this->printErrorMsg("$docDareId does not exist in the system");
                return false;
            }
            $pageId = $this->dm->getPageIdByDocPage($docInfo['id'], $pageNumber);
            if ($pageId === false) {
                $this->printErrorMsg("Page $pageNumber is not defined in the system for $docDareId");
                return false;
            }
            
            $numColumns = $this->dm->getNumColumns($docInfo['id'], $pageNumber);
            
            foreach ($pageDiv['cols'] as $col) {
                if ($col['colNumber'] > $numColumns) {
                    $this->printErrorMsg("Page $pageNumber has $numColumns column(s) defined, found transcription for column " . $col['colNumber']);
                    return false;
                }
                if (count($col['elements']) === 0) {
                    $this->printWarningMsg("Column " . $col['colNumber'] . "in page $pageNumber is empty, skipping");
                    continue;
                }
                foreach ($col['elements'] as &$element) {
                    if ($element->type !== \AverroesProject\ColumnElement\Element::LINE_GAP && count($element->items) === 0) {
                        $this->printErrorMsg("Empty element in column " . $col['colNumber'] . " page $pageNumber");
                        return false;
                    }
                    $element->editorId = $editorUserId;
                }
                // TODO: support authorIds different from the editorId
                foreach ($col['ednotes'] as $ednote) {
                    $ednote->authorId = $editorUserId;
                }
                print "Updating page $pageNumber, column " . $col['colNumber'] . " in the database\n";
                $newItemIds = $this->dm->updateColumnElements($pageId, $col['colNumber'], $col['elements']);
                
                if ($newItemIds === false) {
                    $this->printErrorMsg("Can't update column elements");
                    return false;
                }
                
                // Update targets
                $edNotes = $col['ednotes'];
                for ($i = 0; $i < count($edNotes); $i++) {
                    $targetId = $edNotes[$i]->target;
                    if (isset($newItemIds[$targetId])) {
                        $edNotes[$i]->target = $newItemIds[$targetId];
                    } else {
                        // This should never happen!
                        $this->printErrorMsg('Editorial note without valid target Id: ' . $targetId, get_object_vars($edNotes[$i]));
                        return false;
                    }
                }
                $this->dm->enm->updateNotesFromArray($edNotes);
            }
            
            
        }
        return true;
    }
    
}