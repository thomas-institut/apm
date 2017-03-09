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

class CreateUserUtility extends CommandLineUtility {
    
    const USAGE = "usage: createuser <username>\n";
    
    public function main($argc, $argv)
    {
        if ($argc != 2) {
            print self::USAGE;
            return false;
        }

        $username = $argv[1];

        if ($this->um->userExistsByUsername($username)) {
            $msg = "$username already exists in the system";
            $this->logger->notice("Tried to create user but $msg", ['username' => $username]);
            $this->printErrorMsg($msg);
            return false;
        }
        
        if (!$this->um->createUserByUsername($username)) {
            $msg = "Cannot create user $username";
            $this->logger->notice($msg, ['username' => $username]);
            $this->printErrorMsg($msg);
            return false;
        }
        
        print "User $username created successfully\n";
        $this->logger->notice("User created successfully", 
                ['username' => $username]);
        
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
            $msg = "Passwords do not match!";
            $this->logger->notice($msg, ['username' => $username]);
            $this->printErrorMsg($msg);
            return false;
        }

        if (!$this->um->storeUserPassword($username, $password1)) {
            $msg = "Could not store password, I'm sorry :(";
            $this->logger->error($msg, ['username' => $username]);
            $this->printErrorMsg($msg);
            return false;
        }

        $this->logger->info("Password for $username changed from command line", ['username' => $username]);
        print "Password updated successfully\n";
        return true;
    }
    
}