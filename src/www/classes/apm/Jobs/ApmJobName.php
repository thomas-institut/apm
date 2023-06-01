<?php

namespace APM\Jobs;

class ApmJobName
{
    const NULL_JOB = 'NullJob';
    const SITE_CHUNKS_UPDATE_DATA_CACHE = 'SiteChunks Update Cache';
    const SITE_DOCUMENTS_UPDATE_DATA_CACHE = 'SiteDocuments Update Cache';
    const API_USERS_UPDATE_TRANSCRIBED_PAGES_CACHE = 'ApiUsers Update TranscribedPages Cache';
    const API_USERS_UPDATE_CT_INFO_CACHE = 'ApiUsers Update CT Info Cache';
    const API_SEARCH_UPDATE_OPENSEARCH_INDEX = 'ApiSearch Update OpenSearch Index';
    const API_SEARCH_UPDATE_TRANSCRIBERS_AND_TITLES_CACHE = 'ApiSearch Update Transcribers and Titles Cache';

}