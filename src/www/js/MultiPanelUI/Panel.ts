/*
 *  Copyright (C) 2021 Universität zu Köln
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


export interface PanelOptions {
  verbose?: boolean;
  debug?: boolean;
  containerSelector?: string;
}

/**
 * A panel inside the MultiUI interface
 *
 */
export class Panel {
  protected verbose: boolean;
  protected debug: boolean;
  protected containerSelector: string;
  protected visible: boolean;
  protected mode: string;

  constructor(options: PanelOptions = {}) {
    this.verbose = options.verbose ?? false;
    this.debug = options.debug ?? false;
    if (this.debug) {
      this.verbose = true;
    }
    if (options.containerSelector === undefined) {
      throw new Error('Panel constructor: containerSelector is required');
    }

    this.containerSelector = options.containerSelector;
    this.visible = false;
    this.mode = '';
  }

  postRender(_id: string, mode: string, visible: boolean): void {
    this.visible = visible;
    this.mode = mode;
  }

  onResize(visible: boolean) {
    this.visible = visible;
  }

  onShown() {
    this.visible = true;
  }

  onHidden() {
    this.visible = false;
  }

  getContentClasses(): string[] {
    return [];
  }

  async generateHtml(tabId: string, mode: string, visible: boolean): Promise<string> {
    this.visible = visible;
    this.mode = mode;
    return `Panel id ${tabId}, mode ${mode}, ${visible ? 'visible' : 'hidden'}`;
  }

  getContainerSelector(): string {
    return this.containerSelector;
  }

}