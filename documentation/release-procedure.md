# Release Procedure

Follow these steps in order to release a new APM version:

In the local development environment:

1. Update the version in `package.json`
2. Update the version in `version.yaml`
3. Run `npm install` to make sure all dependencies are up to date.
4. Commit and push the changes with a message like `Version is now X.Y.Z'
5. Tag the commit with 'X.Y.Z'
6. Push the tag: `git push --tags`

In github:

1. Create a new release with the tag

