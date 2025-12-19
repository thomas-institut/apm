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
    const int tPublisher = 130;
    const int tBook = 131;
    const int tBookSection = 132;
    const int tArticle = 133;
    const int tBookSeries = 134;
    const int tOnlineCatalog = 135;
    const int tOldCatalog = 136;
    const int tJournal = 137;
    const int tRepresentation = 138;


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
    const int rAuthorOf = 7017;
    const int rEditorOf = 7018;
    const int rTranslatorOf = 7019;
    const int rDareReviewerOf = 7020;


    // Work Predicates

    const int pWorkAuthor = 7501;
    const int pApmWorkId = 7502;
    const int pWorkShortTitle = 7503;
    const int pWorkIsEnabledInApm = 7504;
    const int pDareRepresentedWorkId = 7505;


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
    const int pDareId = 8701;
    const int pDareCatalogId = 8702;
    const int pTitle = 8703;
    const int pPublicationDate = 8704;
    const int pBibObjectLang = 8705;
    const int pTag = 8706;
    const int pTransliteratedTitle = 8707;
    const int pTranslatedTitle = 8708;
    const int pShortTitle = 8709;
    const int rAuthoredBy = 8710;
    const int rTranslatedBy = 8711;
    const int rEditedBy = 8712;
    const int pContainerVolume = 8713;
    const int pAbstract = 8714;
    const int pDoi = 8715;
    const int pDareIsCatalog = 8716;
    const int pDareInBibliography = 8717;
    const int pDareIsInactive = 8718;
    const int pDareReprintType = 8719;
    const int rDareReviewedBy = 8720;
    const int pRepresentationLang = 8722;
    const int pDareRepresentationSet = 8723;
    const int pRepresentationType = 8724;
    const int pDareBibEntryVolume = 8725;
    const int pDareEntryType = 8726;


    const int rContainedIn = 8727;
    const int pPages = 8728;
    const int rPublishedBy = 8729;
    const int rPubPlace = 8730;
    const int rPublishes = 8731;
    const int rContains = 8732;
    const int pEdition = 8733;
    const int pPubPlace = 8734;
    const int pContainerIssue = 8735;
    const int pDareReviewValidFrom = 8736;
    const int pDareReviewValidUntil = 8737;


    const int rReprintOf = 8750;
    const int rReprintIn = 8751;
    const int rRepresents = 8752;
    const int rIsRepresentedBy = 8753;
    const int rWitnessOf = 8754;
    const int rWitnessedBy = 8755;


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

    const int LangAfar = 20028;
    const int LangAbkhazian = 20029;
    const int LangAfrikaans = 20030;
    const int LangAmharic = 20031;
    const int LangAssamese = 20032;
    const int LangAymara = 20033;
    const int LangAzerbaijani = 20034;
    const int LangBashkir = 20035;
    const int LangBelarusian = 20036;
    const int LangBulgarian = 20037;
    const int LangBihari = 20038;
    const int LangBislama = 20039;
    const int LangBengaliBangla = 20040;
    const int LangTibetan = 20041;
    const int LangBreton = 20042;
    const int LangCatalan = 20043;
    const int LangCorsican = 20044;
    const int LangCzech = 20045;
    const int LangWelsh = 20046;
    const int LangDanish = 20047;
    const int LangBhutani = 20048;
    const int LangGreek = 20049;
    const int LangEsperanto = 20050;
    const int LangEstonian = 20051;
    const int LangBasque = 20052;
    const int LangPersian = 20053;
    const int LangFinnish = 20054;
    const int LangFiji = 20055;
    const int LangFaeroese = 20056;
    const int LangFrisian = 20057;
    const int LangIrish = 20058;
    const int LangScotsGaelic = 20059;
    const int LangGalician = 20060;
    const int LangGuarani = 20061;
    const int LangGujarati = 20062;
    const int LangHausa = 20063;
    const int LangHindi = 20064;
    const int LangCroatian = 20065;
    const int LangHungarian = 20066;
    const int LangArmenian = 20067;
    const int LangInterlingua = 20068;
    const int LangInterlingue = 20069;
    const int LangInupiak = 20070;
    const int LangIndonesian = 20071;
    const int LangIcelandic = 20072;
    const int LangJapanese = 20073;
    const int LangYiddish = 20074;
    const int LangJavanese = 20075;
    const int LangGeorgian = 20076;
    const int LangKazakh = 20077;
    const int LangGreenlandic = 20078;
    const int LangCambodian = 20079;
    const int LangKannada = 20080;
    const int LangKorean = 20081;
    const int LangKashmiri = 20082;
    const int LangKurdish = 20083;
    const int LangKirghiz = 20084;
    const int LangLingala = 20085;
    const int LangLaothian = 20086;
    const int LangLithuanian = 20087;
    const int LangLatvianLettish = 20088;
    const int LangMalagasy = 20089;
    const int LangMaori = 20090;
    const int LangMacedonian = 20091;
    const int LangMalayalam = 20092;
    const int LangMongolian = 20093;
    const int LangMoldavian = 20094;
    const int LangMarathi = 20095;
    const int LangMalay = 20096;
    const int LangMaltese = 20097;
    const int LangBurmese = 20098;
    const int LangNauru = 20099;
    const int LangNepali = 20100;
    const int LangDutch = 20101;
    const int LangNorwegian = 20102;
    const int LangOccitan = 20103;
    const int LangAfanOromoorOriya = 20104;
    const int LangPunjabi = 20105;
    const int LangPolish = 20106;
    const int LangPashtoPushto = 20107;
    const int LangQuechua = 20108;
    const int LangRhaetoRomance = 20109;
    const int LangKirundi = 20110;
    const int LangRomanian = 20111;
    const int LangRussian = 20112;
    const int LangKinyarwanda = 20113;
    const int LangSanskrit = 20114;
    const int LangSindhi = 20115;
    const int LangSangro = 20116;
    const int LangSerboCroatian = 20117;
    const int LangSinghalese = 20118;
    const int LangSlovak = 20119;
    const int LangSlovenian = 20120;
    const int LangSamoan = 20121;
    const int LangShona = 20122;
    const int LangSomali = 20123;
    const int LangAlbanian = 20124;
    const int LangSerbian = 20125;
    const int LangSiswati = 20126;
    const int LangSesotho = 20127;
    const int LangSundanese = 20128;
    const int LangSwedish = 20129;
    const int LangSwahili = 20130;
    const int LangTamil = 20131;
    const int LangTelugu = 20132;
    const int LangTajik = 20133;
    const int LangThai = 20134;
    const int LangTigrinya = 20135;
    const int LangTurkmen = 20136;
    const int LangTagalog = 20137;
    const int LangSetswana = 20138;
    const int LangTonga = 20139;
    const int LangTsonga = 20140;
    const int LangTatar = 20141;
    const int LangTwi = 20142;
    const int LangUkrainian = 20143;
    const int LangUrdu = 20144;
    const int LangUzbek = 20145;
    const int LangVietnamese = 20146;
    const int LangVolapuk = 20147;
    const int LangWolof = 20148;
    const int LangXhosa = 20149;
    const int LangYoruba = 20150;
    const int LangChinese = 20151;
    const int LangZulu = 20152;

    // Materials

    const int MaterialPaper = 20200;
    const int MaterialParchment = 20201;
    const int MaterialMixed = 20202;
    const int MaterialVellum = 20203;
    const int MaterialTissue = 20204;


}