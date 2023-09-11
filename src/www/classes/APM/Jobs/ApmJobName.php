<?php

namespace APM\Jobs;

class ApmJobName
{
    const NULL_JOB = 'NullJob';
    const SITE_CHUNKS_UPDATE_DATA_CACHE = 'SiteChunks Update Cache';
    const SITE_DOCUMENTS_UPDATE_DATA_CACHE = 'SiteDocuments Update Cache';
    const API_USERS_UPDATE_TRANSCRIBED_PAGES_CACHE = 'ApiUsers Update TranscribedPages Cache';
    const API_USERS_UPDATE_CT_INFO_CACHE = 'ApiUsers Update CT Info Cache';
    const API_SEARCH_UPDATE_TRANSCRIPTIONS_OPENSEARCH_INDEX = 'ApiSearch Update Transcriptions OpenSearch Index';
    const API_SEARCH_UPDATE_TRANSCRIBERS_AND_TITLES_CACHE = 'ApiSearch Update Transcribers and Titles Cache';
    const API_SEARCH_UPDATE_EDITIONS_OPENSEARCH_INDEX = 'ApiSearch Update Editions OpenSearch Index';
    const API_SEARCH_UPDATE_EDITORS_AND_TITLES_CACHE = 'ApiSearch Update Editors and Titles Cache';

}