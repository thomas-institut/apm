<?php

namespace APM\Jobs;

class ApmJobName
{
    const string NULL_JOB = 'NullJob';
    const string SITE_WORKS_UPDATE_CACHE = 'SiteWorks Update Cache';
    const string SITE_DOCUMENTS_UPDATE_DATA_CACHE = 'SiteDocuments Update Cache';
    const string API_PEOPLE_UPDATE_CACHE = 'ApiPeople Update Cache';
    const string API_USERS_UPDATE_TRANSCRIBED_PAGES_CACHE = 'ApiUsers Update TranscribedPages Cache';
    const string API_USERS_UPDATE_CT_INFO_CACHE = 'ApiUsers Update CT Info Cache';
    const string API_SEARCH_UPDATE_TRANSCRIPTIONS_INDEX = 'ApiSearch Update Transcriptions Index';
    const string API_SEARCH_UPDATE_TRANSCRIBERS_AND_TITLES_CACHE = 'ApiSearch Update Transcribers and Titles Cache';
    const string API_SEARCH_UPDATE_EDITIONS_INDEX = 'ApiSearch Update Editions Index';
    const string API_SEARCH_UPDATE_EDITORS_AND_TITLES_CACHE = 'ApiSearch Update Editors and Titles Cache';

}