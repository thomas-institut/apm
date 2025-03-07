# APM Installation

### Install Ubuntu Packages

* php
* git
* mysql
* wget
* curl
* llvm
* python3-full
* build-essential
* phpmyadmin 
* memcached
* php-memcached
* php-intl
* pkgconf
* cmake
* lib-cairo2-dev
* gobject-introspection
* libpango1.0
* libgirepository1.0-dev 
* libbz2-dev 
* libreadline-dev 
* libssl-dev 
* zlib1g-dev 
* libsqlite3-dev 
* libncurses5-dev 
* libncursesw5-dev 
* xz-utils 
* tk-dev 
* libharfbuzz-gobject0

## Secure the machine and the webserver (production only)

When installing in production, the machine should be accessible only by SSH and the webserver must have proper
security certificates for HTTPS access. 

A virtual host should be reserved and secured for APM. 

## Create Test Databases and Database Users
Log into mysql as root and create an empty database. In what follows, 
it is assumed that the database name is apm:

``CREATE DATABASE apm;``

Create  a user with full privileges on that database:
```
CREATE USER ‘apmadmin’@’localhost’ IDENTIFIED BY 'somepasswd';
GRANT ALL PRIVILEGES ON apm.* TO ‘apmadmin’@’localhost’;
```
Note the user name, dabatase name and password, since these will be used in the APM’s main configuration file.
Apply the given privilege configuration:

``FLUSH PRIVILEGES;``

## Install and configure Opensearch

Download Opensearch 2.8 files (https://opensearch.org/) and set it up with as a single node
running in 127.0.0.1. All default security parameters are fine 
even for production since Opensearch will never respond to
external queries.

## Install NodeJS and npm

Do NOT install Ubuntu’s node package as this provides a very old version.

Get and install an Ubuntu package for version 16.x 
from nodesource (see documention 
at https://github.com/nodesource/distributions/blob/master/README.md).

Do not install version 18.x since this version still does not 
support NPM package node-gtk, which is used by the edition typesetter.

## Install PHP composer (dev only)

Follow the instructions at https://getcomposer.org

## Install and configure python3

Create a virtual environment for APM's python requirements

``python3 -m venv /path/to/venv``

Install spacy:

``/path/to/venv/bin/pip install -U spacy``

## Install the Code

### Development

Get the code from github

``git clone git@github.com:thomas-institut/apm.git``

Install PHP dependencies:
```
cd apm/src/www
composer install
```
Install Javascript dependencies
``` 
npm install
cd js
npm run build
cd ../node
npm install
```
### Production

Install the installation pack previously created in development. 

## Set up Python
Install Python requirements

``/path/to/venv/bin/pip install -r /path/to/apm/src/python/requirements.txt``

## Create Temporary Folders

The next step is to create temporary folders for the Python 
renderer and a place for the main log file. Normally 
in development these are just folders in your user home directory, 
but any folder to where your Linux user can read and write should work. 
For example:
```
mkdir ~/tmp
mkdir ~/tmp/typesetting-tmp
```
In order for PDF conversion to work, a download directory under
src/www must be created:

```
mkdir src/www/downloads
mkdir src/www/downloads/pdf
```

# Create a Configuration File

Next, create a configuration file for the system.  
Use the given config.sample.php file and create a config.php file. 
Make sure all options have correct values. Pay attention, especially, 
to the values for pdf-renderer and typesetter, which normally have 
to be adjusted to the specific place in which the APM source code 
resides in your machine. 

In production, the configuration file can be stored in /etc

In development run the development webserver in the code’s root directory, all 
file paths in what follows are given in relation to that directory:

``./runphpwebserver``

In production, visit the APM's website address.

At this point, if the main page is loaded in a browser, an error 
indicating that the dabatase is not initialized should appear.

### Load the database

Here there are two options:
 * load the database schema and create a root APM user or 
 * load an existing production or development database. It is usually more 
   useful to have data generated by real users in the development database 
   and then add things just for testing purposes, so this option is 
   recommended even for development

#### Empty Database
The current version of the database schema can be found as constant in
src/public/classes/apm/System/ApmSystemManager.  As of November 2024, it is number 34.

Load the latest DB creation SQL file under /src/db and all update SQL file up to the current DB version. 

In the MySql prompt:
```
use apm;
source db/db30-creation.sql;
source db/db30-to31.sql;
source db/db31-to32.sql;
source db/db32-to33.sql;
source db/db33-to34.sql;
```

Before using the system, a root user should be created:
```
src/public/utilities/createuser <username>
src/public/utilities/makeroot <username>
```

#### Database From an Existing Installation
In the existing installation, perform a database backup with APM’s command line tool. 
From the APM’s public directory (src/public in a development environment or the root directory in a production installation):
sudo utilities/backdb output_directory.
It is normally easier, however, just to copy the latest backup of the production database from TI.one.

```
zcat filename.sql.gz | mysql apm
```

## Setup services (production only)

A service must be created from the APM daemon, and crontab entries for daily database backups.

The APM wiki and the Averroes Project website must be set up as well

## Useful Links

* https://pygobject.gnome.org/index.html
* https://spacy.io/
 
