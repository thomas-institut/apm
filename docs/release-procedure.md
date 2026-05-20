# Release Procedure

Follow these steps in order to release a new APM version. All apps in the repo must have the same version
numbers, corresponding to a particular commit in the main branch.

### 1. Make sure APM is ready to be released

**On github**: Make sure the repository has the desired code in the main branch

**Make sure the code is clean n the local development environment**:

* Pull and checkout the main branch from github.
* Run `composer update thomas-institut/shared-php` to make sure the local branch has the latest shared-php code.
    * Optionally, run `composer update` to update all dependencies.
* Run `npm run build` or `npm run build-dev` for apm, apm-typesetting and ape-backend. Make all three build without
  issues.
* Run tests and make sure they pass for ALL apps: shared-php, apm, ape-backend, ape-frontend.

DO NOT release a new version if any of the builds or any of the tests fails.

### 2. Release on GitHub

**Update version number to X.Y.Z in the local development environment** 
* Update version to X.Y.Z in `composer.json` for apm and ape-backend.
* Update version to X.Y.Z in `package.json` for apm, ape-frontend and apm-typesetting
* Update the version to X.Y.Z in APM's `version.yaml`
* Run `npm install` to make sure all dependencies are up to date and the version is included in the lock file.
* Commit and push the changes with the message "Bump version to X.Y.Z"
* Tag the commit with 'X.Y.Z'
* Push the tag: `git push --tags`

**On github**
* Create a new release with the tag


### 3. Create distribution packages

* Run `create-dist` scripts for the different apps. 
