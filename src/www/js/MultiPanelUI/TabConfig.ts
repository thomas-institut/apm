/*
 *  Copyright (C) 2022 Universität zu Köln
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

import {Panel} from './Panel';

export interface TabConfigInterface {
  id: string,
  title: string,
  linkTitle: string,
  content: (tabId: string, mode: string, visible: boolean) => Promise<string>,
  contentClasses: string[],
  onResize: (id: string, visible: boolean) => void,
  postRender: (id: string, mode: string, visible: boolean) => void,
  onShown: (id: string) => void,
  onHidden: (id: string) => void
}

export class TabConfig {

  /**
   *
   * @param id
   * @param {string}title
   * @param panelObject
   * @param {string}linkTitle
   * @return {TabConfigInterface}
   *
   */
  static createTabConfig(id: string, title: string, panelObject: Panel, linkTitle: string = ''): TabConfigInterface {
    return {
      id: id,
      title: title,
      linkTitle: linkTitle,
      content: (tabId: string, mode: string, visible: boolean) => { return panelObject.generateHtml(tabId, mode, visible) },
      contentClasses: panelObject.getContentClasses(),
      onResize: (id, visible) => {  panelObject.onResize(visible)},
      postRender: (id, mode, visible) => { panelObject.postRender(id, mode, visible) },
      onShown: (id) => { panelObject.onShown()},
      onHidden: (id) => { panelObject.onHidden()}
    }
  }

}