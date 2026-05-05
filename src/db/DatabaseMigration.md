# Database Migration

The database schema has a version number stored in the `ap_settings` table:

```mysql
SELECT * FROM `ap_settings`  WHERE `setting` = 'DatabaseVersion';
```

ApmSystemManager.php expects this number to match its `DB_VERSION` constant:

```php
    const int DB_VERSION = 37;
```

When this number is changed in PHP it means there are changes to the schema. A database migration script must be
created and stored under `src/db`. For example `src/db/db37-to-38.sql` would contain the SQL code to migrate from
DB vesion 37 to 38.

Migration DB files have also instructions about other scripts that need to be run and in what order.