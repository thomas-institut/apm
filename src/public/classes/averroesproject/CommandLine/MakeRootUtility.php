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

namespace AverroesProject\CommandLine;

/**
 * Description of ChangePasswordUtility
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

class MakeRootUtility extends CommandLineUtility {
    
    const USAGE = "usage: makeroot <username>\n";
    
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
        
        if (!$this->um->makeRoot($userId)) {
            $msg = "Can't make $username root";
            $this->logger->error($msg, ['username' => $username]);
            $this->printErrorMsg($msg);
            return false;
        }
        
        $this->logger->info("$username made root from command line", ['username' => $username]);
        print "User $username is now root\n";
        return true;
    }
    
}