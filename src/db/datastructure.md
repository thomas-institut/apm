# Data Structure

The Averroes Project Manager relies on data stored in a number of tables in a 
MySQL server (= the database).

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

## Documents

At this point the Averroes Project Manager is a manager of manuscripts and
their transcriptions, but other types of documents may be added later on.

A __document__ is an ordered collection of __pages__. Each __page__ has one or 
more __columns__ and each column an ordered series of __elements__ of different 
types: headings, lines, glosses, etc. Some elements such as lines, headings and 
glosses, are composed of an ordered sequence of textual __items__ of different 
kinds: plain text, rubrics, sics, unclear text, etc.  


 

