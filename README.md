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

Run composer in ```src/public``` to get all PHP dependencies.

## Production

To install in production:  
* Run ```composer update``` in  ```src/public``` in the
development's machine
* Copy the ```src/public``` directory into the apm directory in the server
* Install the database (see ```src/db```). 
* Make sure the MySQL credentials in ```config.php``` in the app directory are correct.  
* Configure the webserver so that all request ares handled by ```index.php``` 
(in an Apache server this can be done with an ```.htaccess``` file ( see ```apache-htaccess```)
