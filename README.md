# APM
This is the web app running at http://averroes.uni-koeln.de/apm

It requires 

* PHP 8.3 with a few standard extensions.
* MySQL 8
* Collatex (for automatic collation)
* Nodejs (server-side typesetting)
* Font files
* gtk libraries and Python 3 (for server-side PDF generation)
* Typesense (Search engine)
* Valkey (caching)

The production version runs on a relatively modest Ubuntu 22.04 virtual machine with standard packages.

## Bugs / Questions / Feature Requests 

Use https://github.com/thomas-institut/apm/issues 

## Development

Please do help! All help is welcome.

Install and configure your development environment using the dev-compose.yaml file in services-dependencies. Follow
the instructions in that file. The development environment replicates the production configuration almost exactly 
in order to avoid unpleasant surprises when deploying.

Ask administrators for a realistic database for testing.

Choose an issue to work on, create a branch for it and start working. Create a pull request when you are done.

