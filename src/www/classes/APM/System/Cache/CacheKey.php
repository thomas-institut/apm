<?php

namespace APM\System\Cache;


/**
 * Cache keys and prefixes used in the system
 */
class CacheKey
{

    /**
     * Prefix for automatic collation tables.
     *
     * Get/Set: ApiCollation->automaticCollationTable
     */
    const string ApiCollationAutomaticCollationTablePrefix = 'ApiCollation:ACT:';

    /**
     * Prefix for the names index for a given entity type.
     *
     * Entry **must** be invalidated when an entity changes its name
     *
     * Schema:  *PREFIX_{ApiEntity::cacheId}_{entityType}*
     *
     * Get/Set: ApiEntity->nameSearch()
     *
     */
    const string ApiEntityEntityNamesIndexPrefix = 'EntityNamesIndex';


    /**
     * Summary of all people's data for the people page.
     *
     * Get / Set:  ApiPeople->getAllPeopleDataForPeoplePage()
     *
     * Maintained up to date by the APM Daemon.
     *
     */
    const string ApiPeople_PeoplePageData_All =  'ApiPeople:PeoplePage:All';


    const string ApiPeople_PeoplePageData_Parts = 'ApiPeople:PeoplePage:Parts';
    const string ApiPeople_PeoplePageData_PartPrefix = 'ApiPeople:PeoplePage:Part';


    /**
     * Transcription data for ApiSearch
     */
    const string ApiSearchTranscriptions = 'ApiSearch:Transcriptions';

    /**
     * Editions data for ApiSearch
     */
    const string ApiSearchEditions = 'ApiSearch:Editions';

    /**
     * Transcriber data for ApiSearch
     */
    const string ApiSearchTranscribers = 'ApiSearch:Transcribers';

    /**
     * Editors data for ApiSearch
     */
    const string ApiSearchEditors = 'ApiSearch:Editors';

    /**
     * Prefix for ApiSearch lemmata
     *
     * Schema: PREFIX{lemmaString}
     */
    const string ApiSearchLemma = 'ApiSearch:Lemma';

    /**
     * Prefix for a user's collation table data
     *
     * Schema: PREFIX{userId}
     *
     * Get: ApiUsers->getCollationTableInfo()
     *
     * Set: ApiUsers->getCollationTableInfo() and after a change in
     * a collation table in the onCollationTableSaved event with
     * the API_USERS_UPDATE_CT_INFO_CACHE job.
     *
     */
    const ApiUsersCollationTableInfoData = 'ApiUsers-CollationTableInfoData-';


    /**
     * Prefix for a list of transcribed pages by a user
     *
     * Schema: PREFIX{userId}
     *
     * Get: ApiUsers->getTranscribedPages()
     *
     * Set: ApiUsers->getTranscribedPages() and after a change in
     * a transcriptions in the onCollationTableSaved event with
     * the API_USERS_UPDATE_CT_INFO_CACHE job.
     *
     */
    const ApiUsersTranscribedPages = 'ApiUsers-TranscribedPages-';

    /**
     * Prefix for a list of work info items for a person
     *
     * Schema: PREFIX{personId}
     *
     * Get/Set: ApiPeople->getWorksByPerson
     *
     *
     */
    const ApiPeopleWorksByPerson = 'ApiPeopleWorksByPerson-';


}