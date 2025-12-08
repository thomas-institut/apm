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

import { setSiteLanguage, tr } from './common/SiteLang'
import { urlGen } from './common/SiteUrlGen'
import {ApmPage, ApmPageOptions} from './ApmPage';
import { ApmFormats } from './common/ApmFormats'
import { Tid } from '@/Tid/Tid'


export interface BreadCrumb {
  label: string;
  url?: string,
  active?: boolean
}

export interface NormalPageOptions extends ApmPageOptions {

}

/**
 * Base class for all 'normal' web pages in the APM.
 *
 * Normal web pages are all those that display a top menu, a user area and
 * (optionally) a language selector. Non-normal pages are specialized tools
 * such as the transcription editor and the edition composer.
 *
 */
export class NormalPage extends ApmPage {
  private pageContentsDiv!: JQuery <HTMLElement>;
  private topBarDiv!: JQuery <HTMLElement>;
  private footerDiv!: JQuery <HTMLElement>;

  constructor(options : NormalPageOptions|null = null) {
    super(options)
  }

  async bootstrapHtml() {
    $('body').html(await this.getBodyHtml()).addClass(await this.getBodyClass());
  }

  async getBodyHtml() {
    return `<div class="page-top-bar"></div>
    <div class="page-content">Loading...</div>
    <div class="page-footer"></div>`;
  }

  async getBodyClass() {
    return `normal-page`;
  }

  /**
   *
   * @return {Promise<void>}
   */
  async initPage(): Promise<void> {
    await super.initPage();
    await this.bootstrapHtml();
    this.pageContentsDiv = $('div.page-content')
    this.topBarDiv = $('div.page-top-bar')
    this.footerDiv = $('div.page-footer')
    this.topBarDiv.html(await this.genTopNavBarHtml());
    this.pageContentsDiv.addClass(this.getExtraClassesForPageContentDiv().join(' ')).html(await this.genContentHtml());
    this.footerDiv.html(await this.genFooterHtml()).addClass('text-muted');
    if (this.showLanguageSelector) {
      $('#change-lang-en').on('click', this.genOnClickLangChange('en'));
      $('#change-lang-es').on('click', this.genOnClickLangChange('es'));
    }
  }

  getBreadcrumbNavHtml(breadCrumbArray: BreadCrumb[]): string {
    let breadcrumbItemsHtml = breadCrumbArray.map( (breadcrumb : BreadCrumb) => {
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
   * @return {string[]}
   */
  getExtraClassesForPageContentDiv(): string[] {
    return []
  }

  genOnClickLangChange(lang: string) {
    return async (ev :any) => {
      ev.preventDefault()
      await this.saveLangInCache(lang)
      this.changeLanguage(lang)
    }
  }

  /**
   *
   * @return {Promise<string>}
   */
  async genContentHtml(): Promise<string> {
    return `Page content will be here...`;
  }

  changeLanguage(newLang : string): void {
    if (newLang !== this.siteLanguage) {
      setSiteLanguage(newLang)
      this.siteLanguage = newLang
      this.initPage().then( () => {
        console.log(`Site language set to '${newLang}'`)
      })
    }
  }


  async genFooterHtml(): Promise<string> {
    let cd = this.commonData;
    let renderTimeString= ApmFormats.time(cd.renderTimestamp, { withTimeZoneOffset: true});

    return `${cd.appName} v${cd.appVersion} &bull; &copy ${cd.copyrightNotice} &bull; ${renderTimeString}`
  }

  async genTopNavBarHtml() : Promise<string> {
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
<a class="navbar-brand" style="padding:0;" href="${urlGen.siteHome()}"><img src="${urlGen.images()}/apm-logo-plain.svg" alt="APM" height="40" ></a>
        <div id="navbar" class="collapse navbar-collapse">
            <ul class="navbar-nav mr-auto">
                <li class="nav-item"><a class="nav-link" href="${urlGen.siteDashboard()}" title="${tr('Dashboard')}">${tr('Dashboard')}</a></li>
                <li class="nav-item"><a class="nav-link" href="${urlGen.siteDocs()}" title="${tr('Documents')}">${tr('Documents')}</a></li>
                <li class="nav-item"><a class="nav-link" href="${urlGen.siteChunks()}" title="${tr('Works')}">${tr('Works')}</a></li>
                <li class="nav-item"><a class="nav-link" href="${urlGen.sitePeople()}" title="${tr('People')}">${tr('People')}</a></li>
                <li class="nav-item"><a class="nav-link" href="${urlGen.siteSearch()}" title="${tr('Search')}">${tr('Search')}</a></li>
                <li class="nav-item">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</li>
                <li class="nav-item dropdown">
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
                    <i class="fas fa-user"></i>&nbsp;${this.commonData.userInfo.name}</a>
                    <ul class="dropdown-menu dropdown-menu-right">
                        <li><a class="nav-link dd-menu-item" href="${urlGen.sitePerson(Tid.toBase36String(this.userId))}">${tr('My Profile')}</a></li>
                        <li role="separator" class="divider"></li>
                        <li><a class="nav-link dd-menu-item" href="${urlGen.siteLogout()}" title="${tr('Logout')}">${tr('Logout')}</a></li>
                    </ul>
                </li>
            </ul>
            ${languageSelectorHtml}
        </div>
        </nav>`
  }

  getPredicateHtml(predicateName: string, predicateValue:string, divClass = 'entity-predicate'):string {
    let val = predicateValue ?? '';

    return val === '' ? '' :  `<div class="${divClass}"><span class="predicate">${predicateName}</span>: ${predicateValue ?? ''}</div>`
  }
}