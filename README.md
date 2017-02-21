# Averroes Project Manager

This is the web app running on http://averroes.uni-koeln.de/apm

It requires PHP 7.0 and a running MySQL Server 5.7 configured with a database and a user
with access to that database.

## Development

Development requires:
* PHP 7.0
* git
* PHP Composer
* PHPUnit 6.0+
* MySQL 5.7

Get all the dependencies with composer:
```bash
cd src/public
composer update
```

Unit testing:
```bash
cd src/public/test
phpunit .
```

To run the app in development:
* Create configuration file in ``src/public`` 
(see ```src/public/config.sample.php```).
* Create the database structure
with the SQL script ```src/db/dbcreation.sql```. 
* Run the PHP7 webserver with root in ```src``` and with
the given ```localphp.ini```  (this file just makes sure that php-sessions are
stored in the current directory).  Run:
```bash
./runphpwebserver
```

## Installation in production

To install in production:  
* Copy the ```src/public``` directory into the apm directory in the server.
* Create configuration file in ``src/public`` in the server
(see ```src/public/config.sample.php```).
* Create the database structure in the server. 
* Configure the web server so that all request ares handled by ```index.php``` 
(in an Apache server this can be done with an ```.htaccess``` file,  see ```apache-htaccess```)

