import { NormalPage } from './NormalPage'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { tr } from './common/SiteLang'
import { urlGen } from './common/SiteUrlGen'
import { CollapsePanel } from '../widgets/CollapsePanel'
import { compareStrings } from '../toolbox/Util.mjs'
import { Tid } from '../Tid/Tid'
import { WorkId } from '../toolbox/WorkId'

export class WorksPage extends NormalPage {
  constructor (options) {
    super(options);

    let oc = new OptionsChecker({
      context: 'WorksPage',
      optionsDefinition: {
        works: { type: 'object', required: true}
      }
    });

    this.options = oc.getCleanOptions(options);
    this.works = this.options.works;
    console.log(`Works`, this.works);
    this.groupWorksByAuthor(this.works). then( (gw) => {
      this.groupedWorks = gw;
      console.log(`Grouped Works`, this.groupedWorks);
      this.collapses = [];
      this.initPage().then( () => {
        console.log(`Works Page Initialized`)
      })
    });
  }

  /**
   *
   * @param works
   * @private
   */
  async groupWorksByAuthor(works) {
    let groupedWorks = [];
    let workIds = Object.keys(works);
    for(let i = 0; i < workIds.length; i++) {
      let workId = workIds[i];
      let authorId = works[workId]['authorId'];
      if (groupedWorks[authorId] === undefined) {
        groupedWorks[authorId] = {
          authorId: authorId,
          authorName: await this.apmDataProxy.getEntityName(authorId),
          works: []
        }
      }
      groupedWorks[authorId].works.push(works[workId]);
    }

    let gwArray = [];
    Object.keys(groupedWorks).forEach( (key) => {
      gwArray.push(groupedWorks[key]);
    })
    return gwArray.sort( (a, b) => {
     return compareStrings(a.authorName, b.authorName);
    })
      .map ( (gw) => {
      gw.works = gw.works.sort( (a,b) => {
        return WorkId.compare(a['workId'], b['workId']);
      });
      return gw;
    });
  }



  async genContentHtml () {
    let html = `<h2>${tr('Works')}</h2>`;
    html += `<div class="note">There are the works that have transcription, collation table or edition data in the system. 
       Other works can be found by visiting the author's page.</div>`
    this.groupedWorks.forEach( (gw, authorIndex) => {
      html += `<div class="author author-${authorIndex}">
        <h1><a href="${urlGen.sitePerson(Tid.toBase36String(gw.authorId))}">${gw.authorName}</a></h1>`;
      gw.works.forEach( (work, index) => {
          html += `<div class="work work-${authorIndex}-${index}"></div>`;
        })
      html += '</div>';  // author
    })

    return html;
  }

  genWorkDivHtml(work, authorIndex, workIndex) {
    let html = '';
    let chunkNumbers = Object.keys(work['chunks'])
      .map( (k) => { return parseInt(k)})
      .sort( (a,b) => {return a-b});
    let maxChunk = Math.max(...chunkNumbers);
    let cellSize = 'small';
    if (maxChunk >= 100) {
      cellSize = 'medium';
    }
    if (maxChunk >= 1000) {
      cellSize = 'large';
    }
    html += `<div class="chunk-list chunk-list-${cellSize}" id="chunk-list-${authorIndex}-${workIndex}">`;
    html += chunkNumbers.map( ( chunkNumber) => {
      let chunk = work['chunks'][chunkNumber];
      let chunkLabel = chunk['n'];
      if (chunk['ed'] || chunk['ct'] ) {
        chunkLabel = `*${chunkLabel}`;
      }
      return `<div class="chunk-div">
            <a class="chunk-link" href="${urlGen.siteChunkPage(work['workId'], chunk['n'])}" title="View chunk">${chunkLabel}</a>
            </div>`;
    }).join('');
    html += `</div>`; // chunk-list
    return html;
  }

  async initPage () {
    await super.initPage();
    // generate collapse for works
    this.groupedWorks.forEach( (gw, authorIndex) => {
      gw.works.forEach( (work, workIndex) => {
        this.collapses.push(new CollapsePanel({
          containerSelector: `div.work-${authorIndex}-${workIndex}`,
          title: `<a href="${urlGen.siteWorkPage(work['workId'])}">${work['workId']}: <em>${work['title']}</em> </a>`,
          content: this.genWorkDivHtml(work, workIndex),
          contentClasses: [],
          expandLinkTitle: tr('Click to show chunk list'),
          headerClasses: [ 'work-title'],
          iconWhenHidden: '<small><i class="bi bi-caret-right-fill"></i></small>',
          iconWhenShown: '<small><i class="bi bi-caret-down-fill"></i></small>',
          iconAtEnd: true,
          headerElement: 'div',
          initiallyShown: false,
          debug: false
        }));
      })
    });
  }
}

window.WorksPage = WorksPage