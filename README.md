# APM
This is the web app running on http://averroes.uni-koeln.de/apm

It requires PHP 7.2 and a running MySQL Server 5.7 configured with a database 
and a user with access to that database.

## Development

Development requires:
* git
* MySQL 5.7
* PHP 7.2
* PHP Composer
* PHPUnit 7.0+
* npm 3.5+ 
* jasmine 2.6.0+
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

* browse to https://localhost:8888/public/test/SpecRunner.html

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

