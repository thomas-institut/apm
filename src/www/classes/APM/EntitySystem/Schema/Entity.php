<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\TidDefiner;
use APM\EntitySystem\Kernel\TidDefinerTrait;

/**
 * Constants that define tids for all system entities.
 *
 * The constant prefix indicate the kind of entity:
 *    eXXXX:  a particular entity
 *    tXXXX:  an entity type
 *    pXXXX:  a predicate
 *    ValueTypeXXXXX:  a value type
 *
 * Any tid under 100 million (< 100000000) can be used as
 * a system entity
 */
class Entity implements TidDefiner
{
    use TidDefinerTrait;

    // System Entity
    const System = 1;

    // Entity Types

    const tRelation = 101;
    const tAttribute = 102;
    const tEntityType = 103;
    const tValueType = 104;
    const tStatement = 105;
    const tStatementGroup = 106;
    const tPerson = 107;
    const tGeographicalPlace = 108;
    const tGeographicalArea = 109;
    const tLanguage = 110;
    const tUrlType = 111;
    const tIdType = 112;
    const tWork = 113;
    const tAreaType = 114;
    const tOrganization = 115;
    const tOrganizationType = 116;
    const tOccupation = 117;
    const tOrganizationalRole = 118;

    // Value types

    const ValueTypeText = 1001;
    const ValueTypeNumber = 1002;
    const ValueTypeInteger = 1003;
    const ValueTypeBoolean = 1004;
    const ValueTypeTimestamp = 1005;
    const ValueTypeDate = 1006;
    const ValueTypeVagueDate = 1007;
    const ValueTypeTimeString = 1008;
    const ValueTypeGpsCoordinates = 1009;
    const ValueTypeUrl = 1010;
    const ValueTypeWorkId = 1011;
    const ValueTypeEmailAddress = 1111;


    // Basic entity predicates

    const pEntityType = 2001;
    const pEntityName = 2002;
    const pEntityDescription = 2003;
    const pEntityCreationTimestamp = 2004;
    const pSortName = 2005;
    const pNameInOriginalLanguage = 2006;
    const pAlternateName = 2007;
    const pExternalId = 2008;
    const pUrl = 2009;
    const pEmailAddress = 2010;
    const pMember = 2011;
    const pMemberOf = 2012;
    const pDeprecated = 2013;

    // ID predicates that apply to different types of entities
    const pGNDId = 2093;
    const pLocId = 2094;
    const pViafId = 2901;
    const pWikiDataId = 2902;

    // Language predicates
    const pLangIso639Code = 2951;



    // Basic statement metadata predicates

    const pStatementAuthor = 3001;
    const pStatementTimestamp = 3002;
    const pStatementEditorialNote = 3003;

    // Object qualification predicates
    const pObjectLang = 4001;
    const pObjectSequence = 4002;
    const pObjectFrom = 4003;
    const pObjectUntil = 4004;
    const pObjectUrlType = 4005;
    const pObjectIdType = 4006;

    // Cancellation predicates
    const pCancelledBy = 5001;
    const pCancellationTimestamp = 5002;
    const pCancellationEditorialNote = 5003;

    // Merge predicates
    const pMergedInto = 6001;
    const pMergedBy = 6002;
    const pMergeTimestamp = 6003;
    const pMergeEditorialNote = 6004;



    // Person predicates
    const pOccupation = 7008;
    const pDateOfBirth = 7009;
    const pPlaceOfBirth = 7010;
    const pDateOfDeath = 7011;
    const pPlaceOfDeath = 7012;
    const pIsUser = 7013;
    const pIsEnabledUser = 7014;
    const pOrcid = 7015;


    // Work Predicates

    const pWorkAuthor = 7501;
    const pApmWorkId = 7502;
    const pWorkShortTitle = 7503;
    const pWorkIsEnabledInApm = 7504;




    // Geographical Predicates
    const pContainedBy = 8001;
    const pContains = 8002;
    const pCivicAddress = 8003;
    const pGpsCoordinates = 8004;
//    const pRadius = 8005;

//    const pPoliticalDivisionOf = 8006;
//    const pPoliticalDivision = 8007;


    // Url Types

    const UrlTypeGeneric = 9000;
    const UrlTypeViaf = 9001;
    const UrlTypeDb = 9002;
    const UrlTypeDnb = 9003;
    const UrlTypeWikipedia = 9004;





    // ID types
    const IdTypeWikiData = 10001;
    const IdTypeViaf = 10002;
    const IdTypeGnd = 10003;
    const IdTypeOrcid = 10004;


    // Area types

//    const AreaTypeCountry = 11001;
//    const AreaTypeProvince = 11002;
//    const AreaTypeState = 11003;
//    const AreaTypeCity = 11004;
//    const AreaTypeCounty = 11005;
//    const AreaTypeCanton = 11006;


    // Organization types
//    const OrgUniversity = 12001;
//    const OrgDepartment = 12002;
//    const OrgInstitute = 12003;
//    const OrgLibrary = 12004;
//    const OrgReligiousOrder = 12005;
//    const OrgPublishingHouse = 12006;
//    const OrgEditorialBoard = 12007;


    // Occupation types
//    const OccupationPhilosopher = 13001;
//    const OccupationTranslator = 13002;
//    const OccupationProfessor = 13003;
//    const OccupationScholar = 13004;
//    const OccupationPoet = 13005;
//    const OccupationRabbi = 13006;
//    const OccupationMonk = 13007;
//    const OccupationPriest = 13008;
//    const OccupationStudent = 13009;
//    const OccupationEditor = 13010;


    // Dare stuff

    const pDarePersonId = 14001;


    // languages

    const LangArabic = 20001;
    const LangHebrew = 20002;
    const LangLatin = 20003;
    const LangJudeoArabic = 20004;
    const LangAncientGreek = 20005;

    const LangEnglish = 20021;
    const LangGerman = 20022;
    const LangFrench = 20023;
    const LangItalian = 20024;
    const LangSpanish = 20025;
    const LangPortuguese = 20026;
    const LangTurkish = 20027;





}