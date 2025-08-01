export interface CommonData {
    appName: string,
    appVersion: string,
    pageId?: string,
    copyrightNotice: string,
    renderTimestamp: number,
    cacheDataId: string,
    baseUrl: string,
    userInfo?: any,
    siteLanguage?: string,
    showLanguageSelector: boolean,
    devMode?: boolean,
}


/**
 * Options definition object for
 */
export const CommonDataOptionsDefinition = {
    appName: { required: true, type: 'string'},
    appVersion: { required: true, type: 'string'},
    pageId: { type: 'string', default: 'ApmPage'},
    copyrightNotice: { required: true, type: 'string'},
    renderTimestamp: { required: true, type: 'number'},
    cacheDataId: { required: true, type: 'string'},
    baseUrl: { required: true, type: 'string'},
    userInfo: { type: 'object'},
    siteLanguage: { type: 'string', default: ''},
    showLanguageSelector: { type: 'boolean', default: false},
}