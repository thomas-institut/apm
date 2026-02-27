# Release Procedure

Follow these steps in order to release a new APM version:

On github:

1. Make sure the repository has the desired code in the master branch

In the local development environment:

1. Pull and checkout the master branch from github.
2. Run tests and make sure they pass
3. Update the version in `package.json`
4. Update the version in `version.yaml`
5. Run `npm install` to make sure all dependencies are up to date and the version is included in the lock file.
6. Commit and push the changes with a message like `Version is now X.Y.Z'
7. Tag the commit with 'X.Y.Z'
8. Push the tag: `git push --tags`

In github:

1. Create a new release with the tag

