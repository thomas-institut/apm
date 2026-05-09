# FullTX Witness Map

## Rationale for the witness map

APM needs to quickly find important information about full transcription (FullTx) witnesses by witness Id, document,
work and chunk number or a combination of those. A FullTx witness is defined by the
tuple `[ workDareId, chunkNumber, documentId, localId, timestamp ]`:

- workDareId: a unique string identifier that is associated with a work entity, for example 'AW47' is Averroes's
  *Commentary On De Animalibus* (entity id JYJ4-X0MW)
- chunkNumber: an integer
- documentId: the entity id of the document that contains the witness (or a legacy DB id, that can be converted to the
  entity Id)
- localId: a letter ('A', 'B', 'C', etc) that distinguishes witnesses of the same chunk in the same document
- timestamp: a TimeString (e.g. '2025-01-01 13:23:32.123456', which can be encoded as numerical string as
  20250101132332123456) (see TimeString.php)

A FullTx witness id is simply a concatenation of the above fields separated by a hyphen. EG. 'AW47-1-1-A-20250101132332123456'.

FullTx witnesses are not stored explicitly in the database, they are built from document transcriptions.

Document transcriptions are stored in two MySQL tables: `ap_elements` and `ap_items`. Elements represent textual areas
within a column in a page: main text, long marginal additions, etc, and belong to a specific pageId and column number.
Information about pages is stored in the `ap_pages` table with each page belonging to a specific documentId. Items store
the actual transcription of an element: text, rubrics, abbreviations, etc, and belong to a specific elementId. Both
elements and items have a sequence number that is used to order them, and valid_from and valid_until timestamps, which
allow retrieval of the state of the transcription at a specific point in time. Timestamps also avoid storing
the same information over and over again with each update since when a transcription is updated, only the elements and
items that have changed get a new row in the database.

When a user saves a transcription for a column in a page, a version is registered in the `ap_versions_ct` table. The
`time_until` column of this table is used to determine when a version is no longer valid. The current version is the
one with a `time_until` value of `infinity` (actually 'infinity' is represented as '9999-12-31 23:59:59.999999' in
the database).

Transcribers use chunk mark items to specify the start and end of chunk segments in a document. A valid FullTx witness
is one for which there are valid pairs of chunk segment marks (start and end, with the end mark located after the start
mark) for a number of consecutive segment numbers starting from 1. With the information about chunk segment mark
locations it is possible to retrieve the text of the witness at a given timestamp by simply retrieving all valid items
located between the chunk segment marks. It is also possible to give users information about the problems an invalid
FullTx witness may have (e.g., missing chunk segment marks, end located before start, etc). Since chunk mark pairs
are not necessarily in the same column, witnesses may span multiple columns in different pages. Any change in the
transcription of any of these columns will generate a new distinct version of the witness, namely one with the
timestamp of the change, which is also the time_from of the latest version of the latest saved column version in the
column range.

In order to give the frontend information about the contents of a document, or the available witnesses for a specific
work or chunk, the backend needs to have not only the chunk segment mark locations for each witness, but also
the timestamp of latest change in each one. It makes sense to keep a map of the current witnesses in a cache instead
of querying the database for each request:

- work
- chunk
- document
- localId
- witness[]

for each witness:

- FullTx witness id
- timestamp
- chunk segments: locations, validity status, problems
- page+column range: i.e. the list of pages and columns that contain text for the witness
- latest transcriber: the user who last saved a transcription for the witness

## Queries answered using the map

Once the map is built, it can be used to answer queries like:

- witnesses for a chunk
- witnesses for a document
- witnesses for a work

## Map Maintenance

The map can be maintained at very low processing cost by updating the relevant entries in the cache whenever a
user saves a transcription:

- if the saved column includes a chunk segment mark, update the relevant witness entry in the cache and update the
  timestamp of the latest change in the witness as well as the last transcriber
- if the saved column does not include a chunk segment mark, check if the column is part of the page+column range
  of the witness. If it is, update the witness entry in the cache and update the timestamp of the latest change in
  the witness as well as the last transcriber, otherwise do nothing.




