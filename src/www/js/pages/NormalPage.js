/*
 *  Copyright (C) 2022-23 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */


import { OptionsChecker } from '@thomas-inst/optionschecker'
import { setSiteLanguage, SiteLang, tr } from './common/SiteLang'
import { setBaseUrl, urlFor } from './common/SiteUrlGen'
import { ApmDataProxy } from './common/ApmDataProxy'



/**
 * Base class for (eventually) all 'normal' web pages in the APM.
 *
 * Normal web pages are all those that display a top menu, a user area and
 * (optionally) a language selector. Non-normal pages are specialized tools
 * such as the transcription editor and the edition composer.
 *
 */
export class NormalPage {

  constructor(options) {

    let optionsChecker = new OptionsChecker({
      context: 'NormalPage',
      optionsDefinition: {
        basicData: {
          required: true,
          type: 'object',
          objectDefinition: {
            apmVersion: { required: true, type: 'string'},
            cacheDataId: { required: true, type: 'string'},
            baseUrl: { required: true, type: 'string'},
            userInfo: { type: 'object'},
            siteLanguage: { type: 'string', default: ''},
            showLanguageSelector: { type: 'boolean', default: false}
          }
        }
      }
    })
    let cleanOptions = optionsChecker.getCleanOptions(options)
    this.normalPageOptions = cleanOptions.basicData
    setBaseUrl(this.normalPageOptions.baseUrl);
    this.userId = this.normalPageOptions.userInfo['id'];
    this.userTid = this.normalPageOptions.userInfo['tid'];
    this.userName = this.normalPageOptions.userInfo.userName;

    this.apmDataProxy = new ApmDataProxy(this.normalPageOptions.cacheDataId)

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
    this.pageContentsDiv = $('div.normal-page-content')
    this.topBarDiv = $('div.normal-page-top-bar')
    this.footerDiv = $('div.normal-page-footer')
  }


  /**
   *
   * @return {Promise<void>}
   */
  initPage() {
    return new Promise ( async (resolve) => {
      this.topBarDiv.html(await this.genTopNavBarHtml());
      this.pageContentsDiv.addClass(this.getExtraClassesForPageContentDiv().join(' ')).html(await this.genHtml());
      this.footerDiv.html(await this.genFooterHtml()).addClass('text-muted');
      if (this.showLanguageSelector) {
        $('#change-lang-en').on('click', this.genOnClickLangChange('en'));
        $('#change-lang-es').on('click', this.genOnClickLangChange('es'));
      }
      resolve();
    })
  }

  getBreadcrumbNavHtml(breadCrumbArray) {
    let breadcrumbItemsHtml = breadCrumbArray.map( (breadcrumb) => {
      let activeClass = breadcrumb.active === true ? 'active' : '';
      let linkStart = '';
      let linkEnd = '';
      if(breadcrumb.url !== undefined && breadcrumb.url !== ''){
        linkStart = `<a href="${breadcrumb.url}">`;
        linkEnd = '</a>';
      }
      return `<li class="breadcrumb-item ${activeClass}">${linkStart}${breadcrumb.label}${linkEnd}</li>`;
    }).join('')
    return `<nav aria-label="breadcumb"><ol class="breadcrumb">${breadcrumbItemsHtml}</ol></nav>`
  }


  /**
   * Returns extra classes to add to the page content's div
   * @return {*[]}
   */
  getExtraClassesForPageContentDiv() {
    return []
  }

  genOnClickLangChange(lang) {
    return (ev) => {
      ev.preventDefault()
      SiteLang.saveLangInCookie(lang)
      this.changeLanguage(lang)
    }
  }

  /**
   *
   * @return {Promise<string>}
   */
  genHtml() {
    return new Promise( (resolve) => { resolve('')})
  }

  changeLanguage(newLang) {
    if (newLang !== this.siteLanguage) {
      setSiteLanguage(newLang)
      this.siteLanguage = newLang
      this.initPage().then( () => {
        console.log(`Site language set to '${newLang}'`)
      })
    }
  }


  async genFooterHtml() {
    return this.normalPageOptions.copyrightHtml
  }

  async genTopNavBarHtml() {
    let languageSelectorHtml = ''
    if (this.showLanguageSelector) {
      languageSelectorHtml = `<ul class="navbar-nav">
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#"  data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
                    ${this.siteLanguage.toUpperCase()}</a>
                    <ul class="dropdown-menu dropdown-menu-right">
                        <li><a class="nav-link dd-menu-item" href="#" id="change-lang-en">EN - English</a></li>
                        <li><a class="nav-link dd-menu-item" href="#" id="change-lang-es">ES - Español</a></li>
                    </ul>
                </li>
            </ul>`
    }
    return `
<nav class="navbar navbar-expand-lg navbar-light">
<a class="navbar-brand" style="padding:0;" href="${urlFor('siteHome')}"><img src="${urlFor('images')}/apm-logo-plain.svg" alt="APM" height="40" ></a>
        <div id="navbar" class="collapse navbar-collapse">
            <ul class="navbar-nav mr-auto">
                <li class="nav-item"><a class="nav-link" href="${urlFor('siteDashboard')}" title="${tr('Dashboard')}">${tr('Dashboard')}</a></li>
                <li class="nav-item"><a class="nav-link" href="${urlFor('siteDocs')}" title="${tr('Documents')}">${tr('Documents')}</a></li>
                <li class="nav-item"><a class="nav-link" href="${urlFor('siteChunks')}" title="${tr('Works')}">${tr('Works')}</a></li>
                <li class="nav-item"><a class="nav-link" href="${urlFor('siteUsers')}" title="${tr('Users')}">${tr('Users')}</a></li>
                <li class="nav-item"><a class="nav-link" href="${urlFor('sitePeople')}" title="${tr('People')}">${tr('People')}</a></li>
                <li class="nav-item"><a class="nav-link" href="${urlFor('siteSearch')}" title="${tr('Search')}">${tr('Search')}</a></li>
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
                    <ul class="dropdown-menu dropdown-menu-right">
                        <li><a class="nav-link dd-menu-item" href="${urlFor('siteUserProfile', this.userName)}">${tr('My Profile')}</a></li>
                        <li><a class="nav-link dd-menu-item"  href="${urlFor('siteUserProfile', this.userName)}">${tr('My Settings')}</a></li>
                        <li role="separator" class="divider"></li>
                        <li><a class="nav-link dd-menu-item" href="${urlFor('siteLogout')}" title="${tr('Logout')}">${tr('Logout')}</a></li>
                    </ul>
                </li>
            </ul>
            ${languageSelectorHtml}
        </div>
        </nav>`
  }
}