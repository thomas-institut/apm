<?php

/* 
 *  Copyright (C) 2016 Universität zu Köln
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

namespace AverroesProject;

require '../vendor/autoload.php';
require '../config.php';
require '../config.tables.php';

use AverroesProject\DataTable\MySqlDataTable;
use AverroesProject\DataTable\MySqlDataTableWithRandomIds;

$dbh = new \PDO('mysql:dbname='. $config['db']['db'] . ';host=' . $config['db']['host'], 
        $config['db']['user'], 
        $config['db']['pwd']);
$dbh->query("set character set 'utf8'");
$dbh->query("set names 'utf8'");


$um = new UserManager(
            new MySqlDataTableWithRandomIds($dbh, $config['tables']['users'], 10000, 100000),
            new MySqlDataTable($dbh, $config['tables']['relations']), 
            new MySqlDataTable($dbh, $config['tables']['people']));

if ($argc != 2){
    print "Please give a username.\n";
    die;
}

$username = $argv[1];

if (!$um->userExistsByUsername($username)){
    print "ERROR: $username is not a valid username in the system.\n";
    die();
}
print "Password: ";
system('stty -echo');
$password1 = trim(fgets(STDIN));
system('stty echo');
echo "\n";
print "Type password again: ";
system('stty -echo');
$password2 = trim(fgets(STDIN));
system('stty echo');
echo "\n";
if ($password1 !== $password2){
    print "ERROR: Passwords do not match!\n";
    die();
}

if (!$um->storeUserPassword($username, $password1)) {
    print "ERROR: Could not store password, I'm sorry :(\n";
    die();
}

print "Password changed successfully\n";


