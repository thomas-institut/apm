# Averroes Project Manager

This is the web app running on http://averroes.uni-koeln.de/apm

It requires PHP 7.0 and a running MySQL Server 5.7 configured with a database and a user
with access to that database.

To install in production,  run ```composer update``` in  ```src/public``` in the
development's machine and 
copy the ```src/public``` directory into the apm directory in the server. Then 
install the database (see ```src/db```). Make sure the MySQL credentials
in ```config.php``` in the app directory are correct.  Configure the webserver
so that all request are handled by ```index.php```.


## Development

Development requires:
= PHP 7.0
= git
= PHP Composer
= PHPUnit 6.0+
= MySQL 5.7

Run composer in ```src/public``` to get all PHP dependencies.

