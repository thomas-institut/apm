export interface CommonData {
    appName: string,
    appVersion: string,
    pageId?: string,
    copyrightNotice: string,
    renderTimestamp: number,
    cacheDataId: string,
    baseUrl: string,
    userInfo?: CommonDataUserInfo,
    siteLanguage?: string,
    showLanguageSelector: boolean,
    devMode?: boolean,
}


export interface CommonDataUserInfo {
    name: string;
    userName: string;
    tidString: string;
    email: string;
    emailAddress: string;
    disabled: boolean;
    isRoot: boolean;
    readOnly: boolean;
    id: number;
    manageUsers: boolean;
    root: boolean;
    tags: string[];
}