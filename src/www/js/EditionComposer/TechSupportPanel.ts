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

import {Panel, PanelOptions} from '@/MultiPanelUI/Panel';
import {OptionsChecker} from '@thomas-inst/optionschecker';
import {deepCopy} from '@/toolbox/Util';
import {JSONEditor} from 'vanilla-jsoneditor';
import {MultiToggle} from '@/widgets/MultiToggle';
import {CtDataInterface} from "@/CtData/CtDataInterface";
import {Edition} from "@/Edition/Edition";

/**
 * A panel with tech support tools
 */


interface TechSupportPanelOptions extends PanelOptions {
  active: boolean,
  ctData: CtDataInterface,
  edition: Edition,
}

export class TechSupportPanel extends Panel {

  private options: TechSupportPanelOptions;
  private active: boolean;
  private ctData: CtDataInterface;
  private edition: Edition;
  private jsonEditor: JSONEditor | null = null;
  private typesetEdition: any;
  private dataViewToggle!: MultiToggle;

  constructor(options: TechSupportPanelOptions) {
    super(options);
    let optionsSpec = {
      active: {type: 'boolean', default: false}, ctData: {type: 'object'}, edition: {type: 'object'}
    };
    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context: 'Admin Panel'});
    this.options = oc.getCleanOptions(options);
    this.active = options.active ?? false;
    this.ctData = deepCopy(options.ctData);
    this.edition = deepCopy(this.options.edition);
    this.typesetEdition = null;
    this.jsonEditor = null;

  }


  async generateHtml(_tabId: string, _mode: string, _visible: boolean) {
    return `<h3>Tech Support</h3>
       <div class="panel-toolbar"><div class="panel-toolbar-group data-view-toggle"></div></div>
       <div id="json-editor-div"></div>`;
  }

  postRender(id: string, mode: string, visible: boolean) {
    super.postRender(id, mode, visible);
    const ele = document.getElementById('json-editor-div');
    if (ele !== null) {
      this.jsonEditor = new JSONEditor({
        target: ele, props: {
          content: {text: JSON.stringify(this.ctData)}, readOnly: true
        }
      });
    }

    this.dataViewToggle = new MultiToggle({
      containerSelector: 'div.data-view-toggle',
      title: '',
      buttonClass: 'dv-button',
      initialOption: 'ctData',
      wrapButtonsInDiv: true,
      buttonsDivClass: 'panel-toolbar-item',
      buttonDef: [{label: 'CT Data', name: 'ctData', helpText: 'CT Data'}, {
        label: 'Edition', name: 'edition', helpText: 'Generated edition'
      }, {label: 'Typeset Edition', name: 'typesetEdition', helpText: 'Typeset edition'}]
    });
    this.dataViewToggle.on('toggle', async () => {
      await this.loadEditor(this.dataViewToggle.getOption());
    });
  }


  setActive(active: boolean) {
    this.active = active;
  }

  /**
   * Loads standard data into the JSON editor
   */
  async loadEditor(dataName: string) {
    if (this.jsonEditor === null) {
      return;
    }
    switch (dataName) {
      case 'ctData':
        await this.jsonEditor.set({text: JSON.stringify(this.ctData)});
        break;

      case 'edition':
        await this.jsonEditor.set({text: JSON.stringify(this.edition)});
        break;

      case 'typesetEdition':
        await this.jsonEditor.set({text: JSON.stringify(this.typesetEdition)});
        break;
    }
  }

  updateTypesetEdition(typesetEdition: Edition) {
    this.typesetEdition = deepCopy(typesetEdition);
    if (this.jsonEditor !== null) {
      this.loadEditor(this.dataViewToggle.getOption()).then();
    }
  }


  updateData(ctData: CtDataInterface, edition: Edition) {
    if (this.active) {
      this.ctData = deepCopy(ctData);
      this.edition = deepCopy(edition);
      if (this.jsonEditor !== null) {
        this.loadEditor(this.dataViewToggle.getOption()).then();
      }
    }
  }


}