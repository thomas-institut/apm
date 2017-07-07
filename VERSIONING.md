# Version Numbers

The system has a simple version number scheme:  X.y.z,   e.g., 0.4.1

Changes in the third number denote a bug fix or other minor change. E.g., 
from 0.4.1 to 0.4.2

Changes in the second number denote the implementation of one or more
features and possibly some bug fixes. E.g. From 0.4 to 0.5

Changes in the first number denote a major system change. As of July 2017, the
system is in beta status and is being tested by some editors. Versions are
thus still 0.y.z

# Git branching

The following model is used: http://nvie.com/posts/a-successful-git-branching-model/
but in a simplified manner. Development is done in the 'develop' branch or branches
derived from it.  The 'master' branch has the current production code.

Releasing a new version into production is done as follows: 
* Push to github and merge all required development branches into the develop branch
* Make sure all tests pass. Do not forget to check database upgrade code!(```src/db```)
* Do a last commit on the develop branch and push it to github
* Checkout the master branch: ```git checkout master```
* Merge the develop branch: ```git merge develop```
* Clean up: images, css, documentation, change version number ```src/public/index.php```
* Commit and push the master branch
* Tag the master branch with the new version and push the tag to github

At this point the development machine and github are in sync and the master branch
is the new production code. This is a good time to upgrade the production server
to the new code.

To continue developing, checkout the develop branch and merge the master branch





