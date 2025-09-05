<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\TidDefiner;
use APM\EntitySystem\Kernel\TidDefinerTrait;

/**
 * Constants that define ids for all system entities.
 *
 * The constant prefix indicates the kind of entity:
 *    - eXXX: a particular entity
 *    - tXXX: an entity type
 *    - pXXX: a predicate
 *    - ValueTypeXXXXX: a value type
 *
 * Any id under 100 million (< 100000000) can be used as
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

    // Location Types
    const int tCountry = 125;
    const int tCity = 126;
    const int tInstitution = 127;

    // Special
    const int tDareMaterial = 128;
    const int tBibObject = 129;
    const int tBibEntry = 130;
    const int tPublisher = 131;



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
    const int pStoredAt = 7608;
    const int pSignature = 7670;




// Dare Document Predicates

    const int pDareHasImages = 7610;
    const int pDareImagesComplete = 7611;
    const int pDareHasPlaceholders = 7612;
    const int pDareIsFragmentary = 7613;
    const int pDareIsDareFoliated = 7614;
    const int pDarePageCount = 7615;
    const int pDareAltRepository = 7618;
    const int pDareContentTitle = 7619;
    const int pDareContentSummary = 7620;
    const int pDareIsSegmented = 7621;
    const int pDareLeavesCount = 7622;
    const int pDareMaterialType = 7623;
    const int pDareLeavesFormat = 7624;
    const int pDareLeavesHeight = 7625;
    const int pDareLeavesWidth = 7626;
    const int pDareWrittenLines = 7627;
    const int pDareWrittenLinesText = 7628;
    const int pDareColumnNo = 7629;
    const int pDareWrittenHeight = 7630;
    const int pDareWrittenWidth = 7631;
    const int pDareHandNumber = 7632;
    const int pDareContemporaryBinding = 7633;
    const int pDareBindingWidth = 7634;
    const int pDareBindingHeight = 7635;
    const int pDareBindingDate = 7636;
    const int pDareOriginNotBefore = 7637;
    const int pDareOriginNotAfter = 7638;
    const int pDareOriginDate = 7639;
    const int pDareOriginPlace = 7640;
    const int pDareFoliation = 7641;
    const int pDareCollation = 7642;
    const int pDareConditionDescription = 7643;
    const int pDareDecoration = 7644;
    const int pDareLayout = 7645;
    const int pDareHandDescription = 7646;
    const int pDareBindingDescription = 7647;
    const int pDareAcquisition = 7648;
    const int pDareProvenance = 7649;
    const int pDareAdditions = 7650;
    const int pDareGwNo = 7651;
    const int pDareIstc = 7652;
    const int pDareContent = 7656;
    const int pDareMaterialDescription = 7657;
    const int pDareOrigin = 7658;
    const int pDareSignature = 7659;


    // Geographical Predicates
    const int pContainedBy = 8001;
    const int pContains = 8002;
    const int pCivicAddress = 8003;
    const int pGpsCoordinates = 8004;
    const int pAreaType = 8005;

    const int pLocatedIn = 8006;

    const int pDareCountryCode = 8007;
    const int pDareCityCode = 8008;
    const int pDareInstCode = 8009;
    const int pDareLongInstCode = 8010;
    const int pDareLongCityCode = 8012;
    const int pDareRepositoryId = 8011;


    // Edition source predicates

    const int pDefaultSiglum = 8501;
    const int pApplicableLanguage = 8502;
    const int pApplicableWork = 8503;
    const int pSpecificSource = 8504;


    // Bib Predicates
    const int pDareBibEntryId = 8700;
    const int pBibObjectType = 8701;
    const int pDareCatalogId = 8702;
    const int pTitle = 8703;
    const int pPublicationDate = 8704;
    const int pBibObjectLang = 8705;
    const int pTag = 8706;
    const int pTranscriptTitle = 8707;
    const int pTranslatedTitle = 8708;
    const int pShortTitle = 8709;
    const int pAuthor = 8710;
    const int pTranslator = 8711;
    const int pEditor = 8712;
    const int pVolume = 8713;
    const int pAbstract = 8714;
    const int pDoi = 8715;
    const int pDareIsCatalog = 8716;
    const int pDareInBibliography = 8717;
    const int pDareIsInactive = 8718;
    const int pReprintType = 8719;
    const int pDareEntryReviewedBy = 8720;
    const int pDareEntryReviewValidFrom = 8721;
    const int pDareEntryReviewValidUntil = 8722;
    const int pHasRepresentation = 8723;
    const int pRepresentationType = 8724;
    const int pRepresentation = 8725;

    const int pDareBookSectionEntryId = 8726;
    const int rPublishedIn = 8727;
    const int pPages = 8728;
    const int pPublisher = 8279;
    const int pPubPlace = 8730;

    const int pDareBookEntryId = 8731;
    const int pSeries = 8732;
    const int pEdition = 8733;

    const int pDareArticleEntryId = 8734;
    const int pIssue = 8735;

    const int rReprintOf = 8750;
    const int rReprintIn = 8751;
    const int rRepresents = 8752;
    const int rIsRepresentedBy = 8753;


    // Bib Objects
    const int BibObjectBook = 8800;
    const int BibObjectBookSection = 8801;
    const int BibObjectArticle = 8802;
    const int BibObjectBookSeries = 8803;
    const int BibObjectOnlineCatalog = 8804;
    const int BibObjectOldCatalog = 8805;
    const int BibObjectJournal = 8806;


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

    // Languages

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

    // Materials

    const int MaterialPaper = 20028;
    const int MaterialParchment = 20029;
    const int MaterialMixed = 20030;
    const int MaterialVellum = 20031;
    const int MaterialTissue = 20032;


}