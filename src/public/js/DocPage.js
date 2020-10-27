/*
 *  Copyright (C) 2020 Universität zu Köln
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

import {OptionsChecker} from '@thomas-inst/optionschecker'

export class DocPage {
  constructor(pages, chunkInfo, versionInfo, lastSaves, works, authors, docId, urlGenerator) {
    this.chunkInfo = chunkInfo;
    this.docId = docId;
    this.works = works;
    this.urlGenerator = urlGenerator;
    this.pages = pages;
    this.versionInfo = versionInfo;
    this.authors = authors;
    this.lastSaves = lastSaves;

    let oc = new OptionsChecker({}, 'test')
  }
  genWorkInfoHtml() {
    if (Object.keys(this.chunkInfo).length === 0) {
      return '<ul>No chunk start/end marks found</ul>';
    }
    let html = '<ul>';
    let works = this.works;
    let chunkInfo = this.chunkInfo;
    let urlGenerator = this.urlGenerator;
    let docId = this.docId;
    for (const work in this.chunkInfo) {
      if (!this.chunkInfo.hasOwnProperty(work)) {
        continue;
      }
      html += '<li>' + works[work]['author_name'] + ', <em>' + works[work]['title'] + '</em> (' + work + ')';
      html += '<ul><li>';
      let chunksPerLine = 5;
      let tdArray = [];
      for (const chunkNumber in chunkInfo[work]) {
        if (!chunkInfo[work].hasOwnProperty(chunkNumber)) {
          continue;
        }
        let tdHtml = '';
        tdHtml += this.getChunkLabelHtml(work, chunkNumber) + ': ';
        let segmentArray = [];
        for (const segmentNumber in chunkInfo[work][chunkNumber]) {
          if (!chunkInfo[work][chunkNumber].hasOwnProperty(segmentNumber)) {
            continue;
          }
          let segmentHtml = '';
          let segmentInfo = chunkInfo[work][chunkNumber][segmentNumber];
          let startLabel = segmentInfo['start'] === '' ? '???' : this.getPageLink(segmentInfo['start']);
          let endLabel = segmentInfo['end'] === '' ? '???' : this.getPageLink(segmentInfo['end']);
          segmentHtml += startLabel + ' &ndash; ' + endLabel;
          if (!segmentInfo['valid']) {
            segmentHtml += ' <a href="#" title="' + segmentInfo['errorMsg'] + '">*</a>';
          }
          segmentArray.push({ seg: segmentNumber, html: segmentHtml });
        }
        if (segmentArray.length > 1) {
          tdHtml += '<small>' + segmentArray.length + ' segments <br/>';
          for (const i in segmentArray) {
            tdHtml += '&nbsp;&nbsp;' + segmentArray[i].seg + ': ' + segmentArray[i].html + '<br/>';
          }
        }
        else {
          tdHtml += '<small>' + segmentArray[0].html;
        }
        tdHtml += '&nbsp;';
        tdHtml += this.getChunkLink(work, chunkNumber);
        tdHtml += '</small>';
        tdArray.push(tdHtml);
      }
      // @ts-ignore
      html += ApmUtil.getTable(tdArray, 5, 'chunktable');
      html += '</ul>';
    }
    return html;
  }
  getPageTableHtml() {
    let pagesPerRow = 10;
    // @ts-ignore
    if (Object.keys(this.pages).length > 200) {
      pagesPerRow = 25;
    }
    // @ts-ignore
    return ApmUtil.getPageTable(this.docId, this.pages, pagesPerRow, this.urlGenerator);
  }
  getChunkLabelHtml(work, chunk) {
    let dataContent = '';
    if (!this.isChunkValid(work, chunk)) {
      dataContent = 'Not defined correctly';
    }
    else {
      // @ts-ignore
      let formattedTime = ApmUtil.formatVersionTime(this.versionInfo[work][chunk].timeFrom);
      let authorName = '';
      if (this.versionInfo[work][chunk].authorId !== 0) {
        authorName = this.authors[this.versionInfo[work][chunk].authorId].fullname;
      }
      dataContent = '<b>Last change:</b><br/>' + formattedTime + '<br/>' + authorName;
    }
    return '<a class="alwaysblack" href="#" data-toggle="popover" title="' +
      work + '-' + chunk +
      '" data-content="' +
      dataContent +
      '">' +
      chunk +
      '</a>';
  }
  isChunkValid(work, chunk) {
    for (const segmentNumber in this.chunkInfo[work][chunk]) {
      if (!this.chunkInfo[work][chunk][segmentNumber].valid) {
        return false;
      }
    }
    return true;
  }
  getChunkLink(work, chunk) {
    let icon = '<span class="glyphicon glyphicon-new-window"></span>';
    // @ts-ignore
    return '<a href="' + this.urlGenerator.siteChunkPage(work, chunk) + '" target="_blank" title="Open chunk page ' +
      work + '-' + chunk + ' in new tab">' +
      icon + '</a>';
  }
  getAuthorLink(authorId) {
    if (authorId == 0) {
      return 'n/a';
    }
    // @ts-ignore
    let url = this.urlGenerator.siteUserProfile(this.authors[authorId].username);
    return '<a href="' + url + '" title="View user profile" target="_blank">' + this.authors[authorId].fullname + '</a>';
  }
  getLastSavesHtml() {
    let html = '<ol>';
    for (const i in this.lastSaves) {
      let versionInfo = this.lastSaves[i];
      // @ts-ignore
      let formattedTime = ApmUtil.formatVersionTime(versionInfo.timeFrom);
      let authorLink = this.getAuthorLink(versionInfo.authorId);
      html += '<li> Page ' + this.getPageLink2(versionInfo.pageId, versionInfo.column) + ', ' +
        formattedTime + ' by ' + authorLink + '</li>';
    }
    html += '</ol>';
    return html;
  }
  getPageLink(segmentInfo) {
    let foliation = segmentInfo['foliation'];
    let pageSeq = segmentInfo['seq'];
    let title = 'View Page ' + segmentInfo['foliation'] + ' in new tab';
    let label = foliation;
    // @ts-ignore
    let url = this.urlGenerator.sitePageView(this.docId, pageSeq);
    if (segmentInfo['numColumns'] > 1) {
      title = 'View Page ' + segmentInfo['foliation'] + ' column ' + segmentInfo['column'] + ' in new tab';
      // @ts-ignore
      url = this.urlGenerator.sitePageView(this.docId, pageSeq, segmentInfo['column']);
      label += ' c' + segmentInfo['column'];
    }
    // @ts-ignore
    return '<a href="' + url + '" target="_blank" title="' + title + '">' + label + '</a>';
  }
  getPageLink2(pageId, col) {
    let pageInfo = this.pages[pageId];
    let foliation = pageInfo.foliation;
    let pageSeq = pageInfo.seq;
    let title = 'View Page ' + foliation + ' in new tab';
    let label = foliation;
    // @ts-ignore
    let url = this.urlGenerator.sitePageView(this.docId, pageSeq);
    if (pageInfo.numCols > 1) {
      title = 'View Page ' + foliation + ' col ' + col + ' in new tab';
      // @ts-ignore
      url = this.urlGenerator.sitePageView(this.docId, pageSeq, col);
      label += ' c' + col;
    }
    // @ts-ignore
    return '<a href="' + url + '" target="_blank" title="' + title + '">' + label + '</a>';
  }
}
