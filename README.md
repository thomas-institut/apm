# APM
This is the web app running at http://averroes.uni-koeln.de/apm

It requires 
* PHP 7.2 with the following extensions enabled: dom (or xml), md, mbstring and zip
* a running MySQL Server 5.7 configured with a database 
and a user with access to that database.
* Java running environment, e.g., Open JDK  (Note: Open JDK11 should not be used; it emits a deprecation warning that breaks Collatex normal output)

It has been tested and has run for a 
while without problems in an Ubuntu 16.04.1 server with PHP 7.2 installed
from  Ondřej Surý's repository (see https://tecadmin.net/install-php-7-on-ubuntu/)

It has been tested also in an Ubuntu 18.04.3 server with standard packages.

## Development

Besides the general requirements given above, development requires:

* git 2.7.4
* an empty test database and a test user with access to it in MySQL
* PHP xdebug extension (for code coverage)
* PHP Composer 1.6.5+
* PHPUnit 7.2.4+
* npm 6.4.1+
* jasmine 3.2.1+ (included in source code)

Clone the repository from Github. 

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
Create a ``testdbconfig.php`` file under ``src/public/test`` with the correct
test database credentials. Use ``src/public/test/testdbconfig.sample.php`` as
a starting point.

Perform all PHP tests: 

```bash
cd src/public/test
phpunit .
```
If the installation is correct, all tests should pass in the master branch. 
If not, create an issue in Github to discuss possible solutions. Don't just
fix the issues and push your master branch to Github as this may break other
people's environments. 

Perform all Javascript tests:

* Install the istanbul code coverage package globally (https://istanbul.js.org/) 
```bash
npm i nyc -g
```
* Before testing and after every change in the javascript code, generate Istanbul code coverage versions of javascript files
```bash
bash src/public/js/generateistanbuljs.bash
```
* browse to http://localhost:8888/public/test/js/runtests.html

These tests should also all pass in the master branch.

To run the app in development:
* Create a configuration file in ``src/public`` 
(see ```src/public/config.sample.php```). Notice especially the location
of the log file and the temporary directory for Collatex, these may have to 
be created. For development purposes, you can use ``log/apm.log`` for the main
log file and ``collatex/tmp`` for the collatex temporary directory as these
are marked as ignored in .gitignore. You need to create them manually.
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

Once you are sure that the development environment is working, checkout or create
a new branch for your changes. Don't work on the master branch.

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

