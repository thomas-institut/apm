# Data Structure

The Averroes Project Manager relies on data stored in a number of tables in a 
MySQL server (= the database). See the ```dbcreation.sql``` file for a
detailed specification of the tables, indexes and foreign keys.

## Systems Settings

Currently the only system setting stored in the database is the database
version number in the table ```ap_settings```

## System Users

System user information is stored in the table ```ap_users```:  id, username,
password hash and session token. Each row in this table is related to a row in
the table ```ap_people```, where general information about the person is stored:
fullname and email address. 

Eventually this people table will be replaced by a similar table in the new
DARE project so that general information about people can be managed from a 
single place. 

The table ```ap_relations``` currently only stores user roles in the system.

## Documents

Currently the Averroes Project Manager is a manager of manuscripts and
printed editions and their transcriptions, but other types of documents may be 
added later on. 

A __document__ is an ordered collection of __pages__. Each __page__ has one or 
more __columns__ and each column has an ordered series of __elements__ of 
different types: headings, lines, glosses, etc. Some elements such as lines, 
headings and glosses, are composed of an ordered sequence of textual __items__ 
of different kinds: plain text, rubrics, sics, unclear text, etc.  

Data about documents is in the table ```ap_docs```, including information 
necessary to retrieve page images from DARE's Bilderberg. 

### Pages 

Page information is in the table ```ap_pages```. Each page is associated with a 
document id, has a default language and an optional foliation number. Each page
has also a type, which corresponds to an entry in the table ```ap_types_page```,
but this information is not used right now.

### Column Elements

If a page has a transcription, this transcription is stored as a number of 
elements in the ```ap_elements``` table. Each element has a type which
corresponds to an entry in the ```ap_types_element``` table: 

 * 1, line, Line of text inside a column
 * 2, head, Column or page heading
 * 3, gloss, Marginal gloss
 * 4, pagenumber, Page number
 * 5, custodes, Custodes
 * 6, notemark, A mark to which notes can refer
 * 7, addition, Added text

Each element is addressable by its parent page id, its column number and its
sequence number. The column number 0 is reserved for elements that are 
associated with the whole page, not with a particular column, for example, page
numbers. Any other element is normally associated with columns 1 and above.

Additionally, each element has an associated language, an editor (which has to 
be a user in the system), and hand id (currently not 
used), and an edition time. 

### Textual items

The textual items that compose some kinds of column elements are stored in the
```ap_items``` table. Each item has a type, which corresponds to an entry
in the ```ap_types_item```: 

 * 1, text, Text
 * 2, rubric, Rubric
 * 3, sic, Sic: text that is obviously wrong. A corrected version could be 
      provided
 * 4, unclear, Unclear text
 * 5, illegible, Illegible text
 * 6, gliph, Illegible gliph
 * 7, addition, Added text
 * 8, deletion, Deleted text
 * 9, mark, A mark in the text to which notes and extra column additions can 
      refer
 * 10, nolb, A mark at the end of an element to signal that the word before it 
       does not end at the break
 * 11, abbreviation, Abbreviation with possible expansion
 * 12, linebreak, Line break

Each item has an associated column element id and a sequence number, plus 
information that varies depending on its type, although normally there is at
least a text string.

### Editorial Notes

Editorial notes stored in a different table outside of the page / element / item
hierarchy, but refer back to either column elements or textual items. Each 
element or item can have multiple notes associated with it. The data is in the
```ap_ednotes``` table. 



