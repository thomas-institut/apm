<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\TidDefiner;
use APM\EntitySystem\Kernel\TidDefinerTrait;

/**
 * Constants that define tids for all system entities.
 *
 * The constant prefix indicate the kind of entity:
 *    eXXX:  a particular entity
 *    tXXX:  an entity type
 *    pXXX:  a predicate
 *    ValueTypeXXXXX:  a value type
 *
 * Any tid under 100 million (< 100000000) can be used as
 * a system entity
 */
class Entity implements TidDefiner
{
    use TidDefinerTrait;

    // System Entity
    const int System = 1;

    // Entity Types

    const int tRelation = 101;
    const int tAttribute = 102;
    const int tEntityType = 103;
    const int tValueType = 104;
    const int tStatement = 105;
    const int tStatementGroup = 106;
    const int tPerson = 107;
    const int tGeographicalPlace = 108;
    const int tGeographicalArea = 109;
    const int tLanguage = 110;
    const int tUrlType = 111;
    const int tIdType = 112;
    const int tWork = 113;
    const int tAreaType = 114;
    const int tOrganization = 115;
    const int tOrganizationType = 116;
    const int tOccupation = 117;
    const int tOrganizationalRole = 118;
    const int tCalendar = 119;
    const int tDocument = 120;
    const int tGenericEditionSource = 121;
    const int tDocumentType = 122;
    const int tImageSource = 123;
    const int tPageType = 124;



    // Value types

    const int ValueTypeText = 1001;
    const int ValueTypeNumber = 1002;
    const int ValueTypeInteger = 1003;
    const int ValueTypeBoolean = 1004;
    const int ValueTypeTimestamp = 1005;
    const int ValueTypeDate = 1006;
    const int ValueTypeVagueDate = 1007;
    const int ValueTypeTimeString = 1008;
    const int ValueTypeGpsCoordinates = 1009;
    const int ValueTypeUrl = 1010;
    const int ValueTypeWorkId = 1011;
    const int ValueTypeEmailAddress = 1111;


    // Basic entity predicates

    const int pEntityType = 2001;
    const int pEntityName = 2002;
    const int pEntityDescription = 2003;
    const int pEntityCreationTimestamp = 2004;
    const int pSortName = 2005;
    const int pNameInOriginalLanguage = 2006;
    const int pAlternateName = 2007;
    const int pExternalId = 2008;
    const int pUrl = 2009;
    const int pEmailAddress = 2010;
    const int pMember = 2011;
    const int pMemberOf = 2012;
    const int pDeprecated = 2013;

    // ID predicates that apply to different types of entities
    const int pGNDId = 2093;
    const int pLocId = 2094;
    const int pViafId = 2901;
    const int pWikiDataId = 2902;

    // Language predicates
    const int pLangIso639Code = 2951;


    // Basic statement metadata predicates

    const int pStatementAuthor = 3001;
    const int pStatementTimestamp = 3002;
    const int pStatementEditorialNote = 3003;

    // Object qualification predicates
    const int pObjectLang = 4001;
    const int pObjectSequence = 4002;
    const int pObjectFrom = 4003;
    const int pObjectUntil = 4004;
    const int pObjectUrlType = 4005;
    const int pObjectIdType = 4006;

    const int pObjectCalendar = 4007;
    const int pQualificationsCalendar = 4008;

    // Cancellation predicates
    const int pCancelledBy = 5001;
    const int pCancellationTimestamp = 5002;
    const int pCancellationEditorialNote = 5003;

    // Merge predicates
    const int pMergedInto = 6001;
    const int pMergedBy = 6002;
    const int pMergeTimestamp = 6003;
    const int pMergeEditorialNote = 6004;

    // Person predicates
    const int pOccupation = 7008;
    const int pDateOfBirth = 7009;
    const int pPlaceOfBirth = 7010;
    const int pDateOfDeath = 7011;
    const int pPlaceOfDeath = 7012;
    const int pIsUser = 7013;
    const int pIsEnabledUser = 7014;
    const int pOrcid = 7015;

    const int pParentOf = 7016;


    // Work Predicates

    const int pWorkAuthor = 7501;
    const int pApmWorkId = 7502;
    const int pWorkShortTitle = 7503;
    const int pWorkIsEnabledInApm = 7504;


    // Document Predicates

    const int pDocumentType = 7601;
    const int pDocumentLanguage = 7602;
    const int pImageSource = 7603;
    const int pInDare = 7604;
    const int pIsPublic = 7605;
    const int pImageSourceData = 7606;
    const int pUseDeepZoomForImages = 7607;




    // Geographical Predicates
    const int pContainedBy = 8001;
    const int pContains = 8002;
    const int pCivicAddress = 8003;
    const int pGpsCoordinates = 8004;

    const int pAreaType = 8005;

    // Edition source predicates

    const int pDefaultSiglum = 8501;
    const int pApplicableLanguage = 8502;
    const int pApplicableWork = 8503;
    const int pSpecificSource = 8504;

    // Url Types

    const int UrlTypeGeneric = 9000;
    const int UrlTypeViaf = 9001;
    const int UrlTypeDb = 9002;
    const int UrlTypeDnb = 9003;
    const int UrlTypeWikipedia = 9004;

    const int UrlTypePersonalHomePage = 9005;
    const int UrlTypeWorkHomePage = 9006;


    // Document types

    const int DocTypeManuscript = 9101;
    const int DocTypePrint = 9102;
    const int DocTypeIncunabulum = 9103;


    // Image Sources
    const int ImageSourceBilderberg = 9201;
    const int ImageSourceAverroesServer = 9202;


    // Page Types
    const int PageTypeNotSet = 9300;
    const int PageTypeText = 9301;
    const int PageTypeFrontMatter = 9302;
    const int PageTypeBackMatter = 9303;


    // Calendars
    const int CalendarGregorian = 9501;
    const int CalendarJulian = 9502;
    const int CalendarIslamicObservational = 9503;
    const int CalendarIslamicTabular = 9504;
    const int CalendarIslamicTabularUlughBeg = 9505;
    const int CalendarIslamicTabularBohras = 9506;
    const int CalendarHebrewObservational = 9507;
    const int CalendarHebrewCalculated = 9508;



    // ID types
    const int IdTypeWikiData = 10001;
    const int IdTypeViaf = 10002;
    const int IdTypeGnd = 10003;
    const int IdTypeOrcid = 10004;


    // Area types

    const int AreaTypeCountry = 11001;
    const int AreaTypeCountryPart = 11002;
    const int AreaTypeProvince = 11003;
    const int AreaTypeState = 11004;
    const int AreaTypeCity = 11005;
    const int AreaTypeCounty = 11006;
    const int AreaTypeCanton = 11007;


    // Organization types



    // Occupation types



    // Legacy or external database ids

    const int pDarePersonId = 14001;

    const int pLegacyApmDatabaseId = 14002;

    // languages

    const int LangArabic = 20001;
    const int LangHebrew = 20002;
    const int LangLatin = 20003;
    const int LangJudeoArabic = 20004;
    const int LangAncientGreek = 20005;

    const int LangEnglish = 20021;
    const int LangGerman = 20022;
    const int LangFrench = 20023;
    const int LangItalian = 20024;
    const int LangSpanish = 20025;
    const int LangPortuguese = 20026;
    const int LangTurkish = 20027;





}