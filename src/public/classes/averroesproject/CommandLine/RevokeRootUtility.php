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

/**
 * Description of ChangePasswordUtility
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

class RevokeRootUtility extends CommandLineUtility {
    
    const USAGE = "usage: revokeroot <username>\n";
    
    public function main($argc, $argv)
    {
        if ($argc != 2) {
            print self::USAGE;
            return false;
        }

        $username = $argv[1];

        if (!$this->um->userExistsByUsername($username)) {
            $msg = "$username does not exist in the system";
            $this->logger->notice($msg, ['username' => $username]);
            $this->printErrorMsg($msg);
            return false;
        }
        $userId = $this->um->getUserIdFromUserName($username);
        
        if ($userId === false ) {
            $msg = "Can't get userId for $username";
            $this->logger->error($msg, ['username' => $username]);
            $this->printErrorMsg($msg);
            return false;
        }
        
        if (!$this->um->revokeRootStatus($userId)) {
            $msg = "Can't revoke $username's root status";
            $this->logger->error($msg, ['username' => $username]);
            $this->printErrorMsg($msg);
            return false;
        }
        
        $this->logger->info("Revoked root status for $username ", ['username' => $username]);
        print "User $username is not root anymore\n";
        return true;
    }
    
}