import { OptionsChecker } from '@thomas-inst/optionschecker'
import { setSiteLanguage, SiteLang, tr } from './common/SiteLang'
import { urlGen } from './common/SiteUrlGen'
import { KeyCache } from '../toolbox/KeyCache'
import { CachedFetcher } from '../toolbox/CachedFetcher'



export class NormalPage {

  constructor(options) {

    let optionsChecker = new OptionsChecker({
      context: 'NormalPage',
      optionsDefinition: {
        baseUrl: { required: true, type: 'string'},
        userId: { type: 'number', default: -1 },
        userInfo: { type: 'object'},
        siteLanguage: { type: 'string', default: ''},
        showLanguageSelector: { type: 'boolean', default: false}
      }
    })
    this.normalPageOptions = optionsChecker.getCleanOptions(options)
    urlGen.setBase(this.normalPageOptions.baseUrl)
    this.userId = this.normalPageOptions.userId
    this.userName = this.normalPageOptions.userInfo.username
    this.cache = new KeyCache()
    this.cachedFetcher = new CachedFetcher(this.cache)
    this.showLanguageSelector = this.normalPageOptions.showLanguageSelector
    if (this.showLanguageSelector) {
      this.siteLanguage = this.normalPageOptions.siteLanguage
      if (this.siteLanguage === '' || this.siteLanguage === 'detect') {
        console.log(`No site language given, detecting language`)
        this.siteLanguage = SiteLang.detectBrowserLanguage()
      }
      setSiteLanguage(this.siteLanguage)
      console.log(`Site language set to '${this.siteLanguage}'`)
    } else {
      this.siteLanguage = 'en'
    }
    this.container = $('#page-content')
    this.topNavBarContainer = $('#top-nav-bar')
  }

  initPage() {
    this.container.html(this.genHtml())
    this.topNavBarContainer.html(this.genTopNavBarHtml())
    if (this.showLanguageSelector) {
      $('#change-lang-en').on('click', this.genOnClickLangChange('en'))
      $('#change-lang-es').on('click', this.genOnClickLangChange('es'))
    }
  }

  genOnClickLangChange(lang) {
    return (ev) => {
      ev.preventDefault()
      SiteLang.saveLangInCookie(lang)
      this.changeLanguage(lang)
    }
  }

  genHtml() {
    return ''
  }

  changeLanguage(newLang) {
    if (newLang !== this.siteLanguage) {
      setSiteLanguage(newLang)
      this.siteLanguage = newLang
      console.log(`Site language set to '${newLang}'`)
      this.initPage()
    }
  }

  fetch(url, forceActualFetch = false) {
    let key = encodeURI(url)
    return this.cachedFetcher.fetch(key, () => {
      return $.get(url)
    }, forceActualFetch)
  }

  genTopNavBarHtml() {

    let languageSelectorHtml = ''
    if (this.showLanguageSelector) {
      languageSelectorHtml = ` <ul class="navbar-nav">
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#"  data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
                    ${this.siteLanguage.toUpperCase()}</a>
                    <ul class="dropdown-menu">
                        <li><a class="nav-link dd-menu-item" href="#" id="change-lang-en">EN - English</a></li>
                        <li><a class="nav-link dd-menu-item" href="#" id="change-lang-es">ES - Español</a></li>
                    </ul>
                </li>
            </ul>`
    }
    return `<div class="container">
        <a class="navbar-brand" style="padding:0;" href="${urlGen.siteHome()}"><img src="${urlGen.images()}/apm-logo-plain.svg" alt="APM" height="50" ></a>
        <div id="navbar" class="collapse navbar-collapse">
            <ul class="navbar-nav mr-auto">
                <li class="nav-item"><a class="nav-link" href="${urlGen.siteDashboard()}" title="${tr('Dashboard')}">${tr('Dashboard')}</a></li>
                <li class="nav-item"><a class="nav-link" href="${urlGen.siteDocs()}" title="${tr('Documents')}">${tr('Documents')}</a></li>
                <li class="nav-item"><a class="nav-link" href="${urlGen.siteChunks()}" title="${tr('Chunks')}">${tr('Chunks')}</a></li>
                <li class="nav-item"><a class="nav-link" href="${urlGen.siteUsers()}" title="${tr('Users')}">${tr('Users')}</a></li>
                <li class="nav-item"><a class="nav-link" href="${urlGen.siteSearch()}" title="${tr('Search')}">${tr('Search')}</a></li>
                <li class="nav-item">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</li>
                <li class="nav-item dropdown">
                   <a href="/" class="nav-link dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">${tr('Useful Links')}</a>
                   <ul class="dropdown-menu">
                       <li><a class="nav-link dd-menu-item" href="https://averroes.uni-koeln.de/apm/wiki">Wiki <i class="fas fa-external-link-alt"></i></a></li>
                       <li><a class="nav-link dd-menu-item" href="https://averroes.uni-koeln.de/legacy/">Legacy Files (e.g., old XML) &nbsp;<i class="fas fa-external-link-alt"></i></a></li>
                       <li><a class="nav-link dd-menu-item" href="https://averroes.uni-koeln.de/">Public Website &nbsp;<i class="fas fa-external-link-alt"></i></a></li>
                    </ul>
                </li>
            </ul>
                
            <ul class="navbar-nav">
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#"  data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
                    <i class="fas fa-user"></i>&nbsp;${this.normalPageOptions.userInfo.fullname}</a>
                    <ul class="dropdown-menu">
                        <li><a class="nav-link dd-menu-item" href="${urlGen.siteUserProfile(this.userName)}">${tr('My Profile')}</a></li>
                        <li><a class="nav-link dd-menu-item"  href="${urlGen.siteUserProfile(this.userName)}">${tr('My Settings')}</a></li>
                        <li role="separator" class="divider"></li>
                        <li><a class="nav-link dd-menu-item" href="${urlGen.siteLogout()}" title="${tr('Logout')}">${tr('Logout')}</a></li>
                    </ul>
                </li>
            </ul>
            ${languageSelectorHtml}
        </div>
        </div>`
  }
}