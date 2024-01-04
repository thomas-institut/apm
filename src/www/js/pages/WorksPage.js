import { NormalPage } from './NormalPage'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { tr } from './common/SiteLang'
import { urlGen } from './common/SiteUrlGen'
import { CollapsePanel } from '../widgets/CollapsePanel'
import { compareStrings } from '../toolbox/Util.mjs'

export class WorksPage extends NormalPage {
  constructor (options) {
    super(options);

    let oc = new OptionsChecker({
      context: 'ChunksPage',
      optionsDefinition: {
        works: { type: 'array', required: true}
      }
    });

    this.options = oc.getCleanOptions(options);
    this.works = this.options.works;

    this.groupedWorks = this.groupWorksByAuthor(this.works);
    console.log(`Works`);
    console.log(this.works);
    console.log(this.groupedWorks);
    this.collapses = [];

    this.initPage().then( () => {
      console.log(`Chunks Page Initialized`)
    })
  }

  /**
   *
   * @param works
   * @private
   */
  groupWorksByAuthor(works) {
    let groupedWorks = [];
    works.forEach( (work) => {
      let authorId = work['work_info']['author_id'];
      if (groupedWorks[authorId] === undefined) {
        groupedWorks[authorId] = {
          authorId: authorId,
          authorName: work['work_info']['author_name'],
          works: []
        }
      }
      groupedWorks[authorId].works.push(work);
    })
    return groupedWorks.filter( n => n).sort( (a, b) => {
     return compareStrings(a.authorName, b.authorName);
    }).map ( (gw) => {
      gw.works = gw.works.sort( (a,b) => {
        return compareStrings(a['work_info']['title'], b['work_info']['title']);
      });
      return gw;
    });
  }



  async genHtml () {
    let html = `<h2>${tr('Works')}</h2>`;
    this.groupedWorks.forEach( (gw, authorIndex) => {
      html += `<div class="author author-${authorIndex}"><h1>${gw.authorName}</h1>`;
      gw.works.forEach( (work, index) => {
          html += `<div class="work work-${authorIndex}-${index}"></div>`;
        })
      html += '</div>';  // author
    })

    return html;
  }

  genWorkDivHtml(work, authorIndex, workIndex) {
    let html = '';
    let maxChunk = Math.max(...work['chunks']);
    let cellSize = 'small';
    if (maxChunk >= 100) {
      cellSize = 'medium';
    }
    if (maxChunk >= 1000) {
      cellSize = 'large';
    }
    html += `<div class="chunk-list chunk-list-${cellSize}" id="chunk-list-${authorIndex}-${workIndex}">`;
    html += work['chunks'].map( ( chunk) => {
      return `<div class="chunk-div">
            <a class="chunk-link" href="${urlGen.siteChunkPage(work['work_info']['dare_id'], chunk)}" title="View chunk">${chunk}</a>
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
          title: `<em>${work['work_info']['title']}</em> (${work['work_id']})`,
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