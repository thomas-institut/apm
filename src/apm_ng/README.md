This is the start of the APM "New Generation" web application. 

At this point, March 2023, the idea is to have only a few PHP-independent JS apps:
* Edition Composer
* MultiChunk Edition Composer
* Transcription Editor
* a main app with the rest

The two edition apps are currently almost completely independent of PHP insofar as they only
need to be instructed about the actual edition to load and will do everything else through
API calls.

The transcription editor can be made independent with relative ease, but this is one app
that needs a lot of work. I think it should be rewritten completely reusing the basic
multi panel UI developed for the edition composers.

The rest of the APM consists of:
* Dashboard: a list of assets the user has contributed to.
* Documents
  * Main: 
    * a searchable list of available documents
    * Admin: link to "Add New Doc" 
  * Doc Details
    * Doc general info
    * List of page with links to TranscriptionEditor
    * Table of contents by chunk
    * List of last changes to the transcription
    * Admin: links to edit doc, delete doc, add pages
* Chunks
  * All Chunks page: list of all chunks defined in transcriptions with links 
    to specific chunk page.
  * Chunk Page:
    * Chunk name and navigation links to next and previous chunk within the same work
    * General info
    * Witness table
    * List of chunk editions and saved collation tables
    * Automatic collation tables section: entry point to generation of collation tables. 
    * Text of each witness in expandable panels
* Users
  * User Manager
    * searchable table of users with links to user profiles.
    * Admin: add new user button and UI  (mini app within the page)
  * User profile
    * User avatar (now gravatar)
    * user info
    * Edit profile, change password and Admin:Make root buttons that open
      UI right in the same page
    * List of assets (like in the user dashboard)
* Search 
  * Search controls
  * Results table
* Useful links: dropdown with external urls
* User menu: dropdown with links to user profile, settings (not actually implemented)
  and logout

All of this can be turned into a single page app with a more responsive UI.