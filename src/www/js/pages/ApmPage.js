import { OptionsChecker } from '@thomas-inst/optionschecker'
import { setBaseUrl } from './common/SiteUrlGen'
import { ApmDataProxy } from './common/ApmDataProxy'
import { setSiteLanguage, SiteLang } from './common/SiteLang'

export class ApmPage {

  constructor (options) {
    let optionsChecker = new OptionsChecker({
      context: 'NormalPage',
      optionsDefinition: {
        commonData: {
          required: true,
          type: 'object',
          objectDefinition: {
            appName: { required: true, type: 'string'},
            appVersion: { required: true, type: 'string'},
            copyrightNotice: { required: true, type: 'string'},
            renderTime: { required: true, type: 'string'},
            cacheDataId: { required: true, type: 'string'},
            baseUrl: { required: true, type: 'string'},
            userInfo: { type: 'object'},
            siteLanguage: { type: 'string', default: ''},
            showLanguageSelector: { type: 'boolean', default: false},
          }
        }
      }
    })
    let cleanOptions = optionsChecker.getCleanOptions(options)
    this.commonData = cleanOptions.commonData
    setBaseUrl(this.commonData.baseUrl);
    this.userId = this.commonData.userInfo['id'];
    this.userTid = this.commonData.userInfo['tid'];
    this.userName = this.commonData.userInfo.userName;

    this.apmDataProxy = new ApmDataProxy(this.commonData.cacheDataId)

    this.showLanguageSelector = this.commonData.showLanguageSelector
    if (this.showLanguageSelector) {
      this.siteLanguage = this.commonData.siteLanguage
      if (this.siteLanguage === '' || this.siteLanguage === 'detect') {
        console.log(`No site language given, detecting language`)
        this.siteLanguage = SiteLang.detectBrowserLanguage()
      }
      setSiteLanguage(this.siteLanguage)
      console.log(`Site language set to '${this.siteLanguage}'`)
    } else {
      this.siteLanguage = 'en'
    }
  }
}