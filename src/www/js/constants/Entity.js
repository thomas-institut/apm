// Entity Types


export const tRelation = 101;
export const tAttribute = 102;
export const tEntityType = 103;
export const tValueType = 104;
export const tStatement = 105;
export const tStatementGroup = 106;
export const tPerson = 107;
export const tGeographicalPlace = 108;
export const tGeographicalArea = 109;
export const tLanguage = 110;
export const tUrlType = 111;
export const tIdType = 112;
export const tWork = 113;
export const tAreaType = 114;
export const tOrganization = 115;
export const tOrganizationType = 116;
export const tOccupation = 117;
export const tOrganizationalRole = 118;

// Value types

export const ValueTypeText = 1001;
export const ValueTypeNumber = 1002;
export const ValueTypeInteger = 1003;
export const ValueTypeBoolean = 1004;
export const ValueTypeTimestamp = 1005;
export const ValueTypeDate = 1006;
export const ValueTypeVagueDate = 1007;
export const ValueTypeTimeString = 1008;
export const ValueTypeGpsCoordinates = 1009;
export const ValueTypeUrl = 1010;
export const ValueTypeEmailAddress = 1111;

// Basic entity predicates

export const pEntityType = 2001;
export const pEntityName = 2002;
export const pEntityDescription = 2003;
export const pEntityCreationTimestamp = 2004;
export const pSortName = 2005;
export const pNameInOriginalLanguage = 2006;
export const pAlternateName = 2007;
export const pExternalId = 2008;
export const pUrl = 2009;
export const pEmailAddress = 2010;
export const pMember = 2011;
export const pMemberOf = 2012;
export const pDeprecated = 2013;

// ID predicates that apply to different types of entities
export const pViafId = 2901;
export const pWikiDataId = 2902;
export const pGNDId = 2093;
export const pLocId = 2094;


// Basic statement metadata predicates

export const pStatementAuthor = 3001;
export const pStatementTimestamp = 3002;
export const pStatementEditorialNote = 3003;

// Object qualification predicates
export const pObjectLang = 4001;
export const pObjectSequence = 4002;
export const pObjectFrom = 4003;
export const pObjectUntil = 4004;
export const pObjectUrlType = 4005;
export const pObjectIdType = 4006;

// Cancellation predicates
export const pCancelledBy = 5001;
export const pCancellationTimestamp = 5002;
export const pCancellationEditorialNote = 5003;

// Merge predicates
export const pMergedInto = 6001;
export const pMergedBy = 6002;
export const pMergeTimestamp = 6003;
export const pMergeEditorialNote = 6004;



// Person predicates
export const pOccupation = 7008;
export const pDateOfBirth = 7009;
export const pPlaceOfBirth = 7010;
export const pDateOfDeath = 7011;
export const pPlaceOfDeath = 7012;
export const pIsUser = 7013;
export const pIsEnabledUser = 7014;
export const pOrcid = 7015;


//    export const pFather = 7013;
//    export const pFatherOf = 7014
//    export const pMother = 7015;
//    export const pMotherOf = 7016;

// Geographical Predicates
export const pContainedBy = 8001;
export const pContains = 8002;
export const pCivicAddress = 8003;
export const pGpsCoordinates = 8004;
//    export const pRadius = 8005;

//    export const pPoliticalDivisionOf = 8006;
//    export const pPoliticalDivision = 8007;


// Url Types

export const UrlTypeGeneric = 9000;
export const UrlTypeViaf = 9001;
export const UrlTypeDb = 9002;
export const UrlTypeDnb = 9003;
export const UrlTypeWikipedia = 9004;

// ID types
export const IdTypeWikiData = 10001;
export const IdTypeViaf = 10002;
export const IdTypeGnd = 10003;
export const IdTypeOrcid = 10004;


// Area types

//    export const AreaTypeCountry = 11001;
//    export const AreaTypeProvince = 11002;
//    export const AreaTypeState = 11003;
//    export const AreaTypeCity = 11004;
//    export const AreaTypeCounty = 11005;
//    export const AreaTypeCanton = 11006;


// Organization types
//    export const OrgUniversity = 12001;
//    export const OrgDepartment = 12002;
//    export const OrgInstitute = 12003;
//    export const OrgLibrary = 12004;
//    export const OrgReligiousOrder = 12005;
//    export const OrgPublishingHouse = 12006;
//    export const OrgEditorialBoard = 12007;


// Occupation types
//    export const OccupationPhilosopher = 13001;
//    export const OccupationTranslator = 13002;
//    export const OccupationProfessor = 13003;
//    export const OccupationScholar = 13004;
//    export const OccupationPoet = 13005;
//    export const OccupationRabbi = 13006;
//    export const OccupationMonk = 13007;
//    export const OccupationPriest = 13008;
//    export const OccupationStudent = 13009;
//    export const OccupationEditor = 13010;


// Dare stuff

export const pDarePersonId = 14001;