# Database Setup

### 1. Create a database

At the MySql prompt:

``create database apm;``

### 2. Create a DB user

At the MySql prompt:

``create user 'apmadmin'@'localhost' identified by 'somepassword';``

``grant all privileges on apm.* to 'apmadmin'@'localhost';``

``flush privileges;``

### 3. Initialize the database

Locate the appropriate database creation SQL file (under ```src/db```) or use a full backup from
an existing, up to date APM installation

At the MySql prompt:

``use apm;``

``source /file/path/thefile .sql``

Extra