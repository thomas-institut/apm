import {WitnessDataItem} from '@/Edition/WitnessDataItem';
import {NumeralStyles} from '@/toolbox/NumeralStyles';
import {getStringVal} from "@/toolbox/UiToolBox";

const forceHandOneDisplaySelectValue = 'forceZero';

interface WitnessDataEditorOptions {
  containerSelector: string,
  sigla: string[],
  lang: string,
  maxHand?: number,
  witnessData: WitnessDataItem[],
  verbose?: boolean,
  debug?: boolean,
  onChange: (witnessData: WitnessDataItem[]) => void,
}

export class WitnessDataEditor {
  private verbose: boolean;
  private readonly debug: boolean;
  private readonly containerSelector: string;
  private container: JQuery<HTMLElement>;
  private sigla: string[];
  private witnessData: WitnessDataItem[];
  private readonly onChange: (witnessData: WitnessDataItem[]) => void;
  private readonly maxHand: number;
  private readonly lang: string;

  constructor(options: WitnessDataEditorOptions) {

    this.verbose = options.verbose ?? false;
    this.debug = options.debug ?? false;
    if (this.debug) {
      this.verbose = true;
    }
    this.containerSelector = options.containerSelector;
    this.container = $(this.containerSelector);
    this.sigla = options.sigla;
    this.witnessData = options.witnessData;
    this.onChange = options.onChange;
    this.maxHand = options.maxHand ?? 4;
    this.lang = options.lang;
    if (this.maxHand < 2) {
      // support at least two hands!
      this.maxHand = 2;
    }
    this.__loadDataAndSetupEvents();
  }

  __loadDataAndSetupEvents() {
    this.container.html(this._getHtml());
    $(`${this.containerSelector} input.siglum-checkbox`).on('change', this._genOnChange());
    $(`${this.containerSelector} select.hand-select`).on('change', this._genOnChange());

  }

  readWitnessDataFromCheckboxes() {
    let newData: WitnessDataItem[] = [];
    this.sigla.forEach((siglum, i) => {
      if (siglum === '-') {
        // hack so that the edition witness does not show up in the list!
        return;
      }
      if ($(`${this.containerSelector} .siglum-checkbox-${i}`).prop('checked')) {
        let dataItem = new WitnessDataItem();
        dataItem.setWitnessIndex(i);
        let selectedValue = getStringVal($(`${this.containerSelector} select.hand-select-${i}`));
        if (selectedValue === forceHandOneDisplaySelectValue) {
          dataItem.setHand(0);
          dataItem.forceHandDisplay = true;
        } else {
          dataItem.setHand(parseInt(selectedValue));
          dataItem.forceHandDisplay = false;
        }
        dataItem.location = '';
        newData.push(dataItem);
      }
    });
    this.witnessData = newData;
  }

  _genOnChange() {
    return () => {
      this.readWitnessDataFromCheckboxes();
      this.onChange(this.witnessData);
    };
  }

  _getHtml() {
    let html = `<div class="form-inline">`;
    let siglaCheckboxesHtml = this.sigla.map((siglum, index) => {
      if (siglum === '-') {
        // hack so that the edition witness does not show up in the list!
        return '';
      }
      let checkedString = this.isSiglumSelectedInWitnessData(index) ? 'checked' : '';
      let hand = this.getSiglumHandInWitnessData(index);
      let forced = this.isHandDisplayForcedInWitnessData(index);

      return `<div class="form-group form-control-sm">
            <div class="form-check">
                <input class="form-check-input siglum-checkbox siglum-checkbox-${index}" type="checkbox" value="entry-${index}" ${checkedString}>
                <label for="siglum-checkbox-${index}" class="form-check-label">${siglum}</label>
            </div>
            <select class="hand-select hand-select-${index}" title="Hand">
                ${this._genHandSelectOptionsHtml(hand, forced)}
            </select>
        </div>`;
    }).join('');

    html += siglaCheckboxesHtml;
    html += '</div>';
    return html;
  }

  _genHandSelectOptionsHtml(hand: number, forcedDisplay: boolean) {
    let html = '';
    // option 0 :  first hand without forced Display
    html += `<option value="0" ${hand === 0 && !forcedDisplay ? 'selected' : ''}>-</option>`;
    // option forced0:  first hand with forced Display
    html += `<option value="${forceHandOneDisplaySelectValue}" ${hand === 0 && forcedDisplay ? 'selected' : ''}>${this.getNumberString(1)}</option>`;
    // the rest
    for (let i = 1; i < this.maxHand; i++) {
      html += `<option value="${i}" ${hand === i ? 'selected' : ''}>${this.getNumberString(i + 1)}</option>`;
    }
    return html;
  }

  isSiglumSelectedInWitnessData(index: number) {
    if (index > this.sigla.length - 1 || index < 0) {
      return false;
    }

    let siglumData = this.witnessData.filter((data) => {
      return data.witnessIndex === index;
    });
    return siglumData.length > 0;
  }

  getSiglumHandInWitnessData(index: number) {
    if (index > this.sigla.length - 1 || index < 0) {
      return 0;
    }
    let siglumData = this.witnessData.filter((data) => {
      return data.witnessIndex === index;
    });
    return siglumData.length === 0 ? 0 : siglumData[0].hand;
  }

  isHandDisplayForcedInWitnessData(index: number) {
    if (index > this.sigla.length - 1 || index < 0) {
      return false;
    }
    let siglumData = this.witnessData.filter((data) => {
      return data.witnessIndex === index;
    });
    return siglumData.length === 0 ? false : siglumData[0].forceHandDisplay;
  }

  getNumberString(n: number) {
    if (this.lang === 'ar') {
      return NumeralStyles.toDecimalArabic(n);
    }
    return NumeralStyles.toDecimalWestern(n);
  }
}