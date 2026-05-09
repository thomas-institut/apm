import {NormalPage, NormalPageOptions} from './NormalPage';


export interface HeaderAndContentPageOptions extends NormalPageOptions {}
export class HeaderAndContentPage extends NormalPage {
  protected headerDiv!: JQuery<HTMLElement>;


  constructor (options:HeaderAndContentPageOptions| null = null) {
    super(options)
  }

  async initPage() {
    await super.initPage();
    this.headerDiv = $('div.page-header');
    this.headerDiv.html(await this.getHeaderHtml());
  }

  async getBodyHtml() {
    return `<div class="page-top-bar"></div>
    <div class="page-header"></div>
    <div class="page-content"></div>
    <div class="page-footer"></div>`;
  }

  async getBodyClass() {
    return `h-and-c-page`;
  }

  async getHeaderHtml(){
    return `Page header will be here`
  }
}