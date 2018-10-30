# APM
This is the web app running at http://averroes.uni-koeln.de/apm

It requires PHP 7.2 and a running MySQL Server 5.7 configured with a database 
and a user with access to that database. It has been tested and has run for a 
while without problems in an Ubuntu 16.04.1 server with PHP 7.2 installed
from  Ondřej Surý's repository (see https://tecadmin.net/install-php-7-on-ubuntu/)


## Development

Development requires:

* git 2.7.4+
* MySQL 5.7
* PHP 7.2
* PHP Composer 1.6.5+
* PHPUnit 7.2.4+
* npm 6.4.1+ 
* jasmine 3.2.1+
* eslint 4.4.1+

Get all PHP dependencies with composer:
```bash
cd src/public
composer update
```

Get all Javascript dependencies with npm:
```bash
cd src/public
npm install
```

PHP Unit testing:
```bash
cd src/public/test
phpunit .
```

To run the app in development:
* Create a configuration file in ``src/public`` 
(see ```src/public/config.sample.php```).
* Create the database structure
with the SQL script ```src/db/dbcreation.sql```. 
* Run the PHP7.2 webserver with root in ```src```  Run:
```bash
./runphpwebserver
```
* Create at least one user in the system with root status using the 
  command line:
```bash
cd src/public/utilities;
./createuser <someuser>
./makeroot <someuser>
```
* Browse to http://localhost:8888/public

Javascript testing: 

* browse to http://localhost:8888/public/test/js/runtests.html

## Installation in production

To install in production:  
* Create a distribution tar file with ```createdist.bash```
* Copy the tar file to the server and unpack it in the desired folder
* Copy config.sample.php to config.php and edit it with the appropriate
  parameters
* Create the database structure in the server. 
* Configure the web server so that all request are handled by ```index.php``` 
  In an Apache server this can be done with the rewrite rules given
  in ```url-rewrite-rules```. Copy them to the directory configuration
  in the apache configuration or to an .htaccess file
* Create at least one user in the system with root status using the command
  line utilities as indicated above.

