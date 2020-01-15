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


declare var ApmUtil: object


class DocShowPage {
    private readonly chunkInfo: object;
    private readonly docId: number;
    private readonly works: object;
    private readonly urlGenerator: object;
    private readonly pages: object;
    private readonly versionInfo: object;
    private readonly authors: object;

    constructor(pages: object, chunkInfo : object, versionInfo: object, works : object, authors: object, docId: number, urlGenerator : object) {
        this.chunkInfo = chunkInfo
        this.docId = docId
        this.works = works
        this.urlGenerator = urlGenerator
        this.pages = pages
        this.versionInfo = versionInfo
        this.authors = authors
    }

    genWorkInfoHtml() {
        let html = '<ul>'
        let works = this.works
        let chunkInfo = this.chunkInfo
        let urlGenerator = this.urlGenerator
        let docId = this.docId
        for(const work in this.chunkInfo) {

            html += '<li>' + works[work]['author_name'] + ', <em>' + works[work]['title'] + '</em> (' + work + ')'
            html += '<ul><li>'
            let chunksPerLine = 5
            let tdArray = []

            for(const chunkNumber in chunkInfo[work]) {
                let tdHtml = ''
                tdHtml += this.getChunkLabelHtml(work, chunkNumber) + ': '
                let segmentArray = []
                for (const segmentNumber in chunkInfo[work][chunkNumber]) {
                    let segmentHtml = ''
                    let segmentInfo = chunkInfo[work][chunkNumber][segmentNumber]
                    let startLabel = segmentInfo['start'] === '' ? '???' : this.getPageLink(segmentInfo['start'])
                    let endLabel = segmentInfo['end'] === '' ? '???' : this.getPageLink(segmentInfo['end'])
                    segmentHtml +=  startLabel + ' &ndash; ' + endLabel
                    if (!segmentInfo['valid']) {
                        segmentHtml += ' <a href="#" title="' + segmentInfo['errorMsg'] + '">*</a>'
                    }
                    segmentArray.push( { seg: segmentNumber, html : segmentHtml })
                }
                if (segmentArray.length > 1 ) {
                    tdHtml += '<small>' + segmentArray.length + ' segments <br/>'
                    for(const i in segmentArray) {
                        tdHtml += '&nbsp;&nbsp;' + segmentArray[i].seg + ': ' + segmentArray[i].html + '<br/>'
                    }
                } else {
                    tdHtml += '<small>' + segmentArray[0].html
                }
                tdHtml += '&nbsp;'
                tdHtml += this.getChunkLink(work, chunkNumber)
                tdHtml += '</small>'

                tdArray.push(tdHtml)
            }
            // @ts-ignore
            html += ApmUtil.getTable(tdArray, 5, 'chunktable')
            html += '</ul>'
        }
        return html
    }

    getPageTableHtml() {
        let pagesPerRow = 10
        // @ts-ignore
        if (this.pages.length > 200) {
            pagesPerRow = 25
        }
        // @ts-ignore
        return ApmUtil.getPageTable(this.docId, this.pages, pagesPerRow, this.urlGenerator)
    }

    getChunkLabelHtml(work, chunk) {
        // @ts-ignore
        let formattedTime = ApmUtil.formatVersionTime(this.versionInfo[work][chunk].timeFrom)

        return '<a class="alwaysblack" href="#" data-toggle="popover" title="' +
            work + '-' + chunk +
            '" data-content="<b>Last change:</b><br/> ' +
            formattedTime
             + '<br/>' +
            this.authors[this.versionInfo[work][chunk].authorId].fullname + '">' +
            chunk +
            '</a>'
    }

    getChunkLink(work, chunk) {
        let icon = '<span class="glyphicon glyphicon-new-window"></span>'

        // @ts-ignore
        return '<a href="' + this.urlGenerator.siteChunkPage(work, chunk) + '" target="_blank" title="Open chunk page ' +
             work + '-' + chunk + ' in new tab">' +
             icon + '</a>'
    }

    getPageLink(segmentInfo ) {

        let foliation = segmentInfo['foliation']
        let pageSeq = segmentInfo['seq']
        let title = 'View Page ' + segmentInfo['foliation'] + ' in new browser tab/window'
        let label = foliation
        if ( segmentInfo['numColumns'] > 1) {
            label += ' c' + segmentInfo['column']
        }


        // @ts-ignore
        return '<a href="' + this.urlGenerator.sitePageView(this.docId,pageSeq) + '" target="_blank" title="' + title + '">' + label + '</a>'

    }
}