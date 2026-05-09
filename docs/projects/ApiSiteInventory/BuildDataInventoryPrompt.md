The file `src/www/index.php` contains API inventory information in comments.
Every relevant API entry point has a comment with a line `API Inventory:` followed by a list of name/value data pairs.

For example:

```php

        /**
         *  My entry point
         * 
         * TODO: make it better (issue #123)
         * 
         * API Inventory:
         *    Method: POST
         *    Authentication: none
         *    Uses action: no
         *    PHP Unit Test: no
         *    PHP Input Schema: yes
         *    PHP Output Schema: yes
         *    ApiClient Method: yes
         */
        $group->post('/entry/path', function (Request $request, Response $response) use ($container) {
```

Go over all comments of this kind in  `src/www/index.php` (and ONLY in that file) and collect the data into the file
`projects/ApiSiteInventory/inventory-{date}.md` where date is the current date as `YYYY-MM-DD`. So on May 4th, 2026 the
file name should be `projects/ApiSiteInventory/inventory-2026-05-04.md`

The output file should contain the title `API Inventory`, followed by the current date and a table with rows
representing API entry points and short descriptions, together with the API inventory information data as extra columns,
and a column with any TODO lines. If the example above were the only comment found in the input file, the table code
would look like this:

```
| Entry Point      | Description          | Method | Authentication | Uses action | PHP Unit Test | PHP Input Schema | PHP Output Schema | ApiClient Method | TODO |
|------------------|----------------------|--------|----------------|-------------|---------------|------------------|-------------------|------------------|------|
| /api/entry/path  | My entry point       | POST   | none           | no          | no            | yes              | yes               | yes              | make it better (issue #123) |

```



