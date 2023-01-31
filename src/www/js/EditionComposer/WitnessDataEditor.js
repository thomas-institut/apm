import { OptionsChecker } from '@thomas-inst/optionschecker'
import { doNothing } from '../toolbox/FunctionUtil.mjs'
import { WitnessDataItem } from '../Edition/WitnessDataItem.mjs'


const forceHandOneDisplaySelectValue = 'forceZero'
export class WitnessDataEditor {
  constructor (options) {
    let oc = new OptionsChecker({
      context: 'WitnessDataEditor',
      optionsDefinition: {
        containerSelector: { type: 'string', required: true},
        sigla: { type: 'array', required: true},
        lang: { type: 'string', default: 'la'},
        maxHand: { type: 'integer', default: 4},
        witnessData: {
          type: 'array',
          required: true,
          elementDefinition: {
            type: 'object',
            objectClass: WitnessDataItem
          }
        },
        verbose: { type: 'boolean', default: false},
        debug: { type: 'boolean', default: false},
        onChange: { type: 'function', default: doNothing}
      }
    })

    let cleanOptions = oc.getCleanOptions(options)
    this.verbose =  cleanOptions.verbose
    this.debug = cleanOptions.debug
    if (this.debug) {
      this.verbose = true
    }
    this.containerSelector = cleanOptions.containerSelector
    this.container = $(cleanOptions.containerSelector)
    this.sigla = cleanOptions.sigla
    this.witnessData = cleanOptions.witnessData
    this.onChange = cleanOptions.onChange
    this.maxHand = cleanOptions.maxHand
    if (this.maxHand < 2) {
      // support at least two hands!
      this.maxHand = 2
    }
    this.__loadDataAndSetupEvents()
  }

  __loadDataAndSetupEvents() {
    this.container.html(this._getHtml())
    $(`${this.containerSelector} input.siglum-checkbox`).on('change', this._genOnChange())
    $(`${this.containerSelector} select.hand-select`).on('change', this._genOnChange())

  }

  readWitnessDataFromCheckboxes() {
    let newData = []
    this.sigla.forEach( (siglum, i) => {
      if (siglum === '-') {
        // hack so that the edition witness does not show up in the list!
        return
      }
      if ($(`${this.containerSelector} .siglum-checkbox-${i}`).prop('checked')) {
        let dataItem = new WitnessDataItem()
        dataItem.setWitnessIndex(i)
        let selectedValue = $(`${this.containerSelector} select.hand-select-${i}`).val()
        if (selectedValue === forceHandOneDisplaySelectValue) {
          dataItem.setHand(0)
          dataItem.forceHandDisplay = true
        } else {
          dataItem.setHand(parseInt(selectedValue))
          dataItem.forceHandDisplay = false
        }
        dataItem.location = ''
        newData.push(dataItem)
      }
    })
    this.witnessData =  newData
  }

  _genOnChange() {
    return () => {
      this.readWitnessDataFromCheckboxes()
      this.onChange(this.witnessData)
    }
  }

  _getHtml() {
    let html = `<div class="form-inline">`
    let siglaCheckboxesHtml = this.sigla.map( (siglum, index) => {
      if (siglum === '-') {
        // hack so that the edition witness does not show up in the list!
        return ''
      }
      let checkedString = this.isSiglumSelectedInWitnessData(index) ? 'checked' : ''
      let hand = this.getSiglumHandInWitnessData(index)
      let forced = this.isHandDisplayForcedInWitnessData(index)

      return `<div class="form-group form-control-sm">
            <div class="form-check">
                <input class="form-check-input siglum-checkbox siglum-checkbox-${index}" type="checkbox" value="entry-${index}" ${checkedString}>
                <label for="siglum-checkbox-${index}" class="form-check-label">${siglum}</label>
            </div>
            <select class="hand-select hand-select-${index}" title="Hand">
                ${this._genHandSelectOptionsHtml(hand, forced)}
            </select>
        </div>`
    }).join('')

    html += siglaCheckboxesHtml
    html += '</div>'
    return html
  }

  _genHandSelectOptionsHtml(hand, forcedDisplay) {
    let html = ''
    // option 0 :  first hand without forced Display
    html +=  `<option value="0" ${hand === 0 && !forcedDisplay ? 'selected' : ''}>-</option>`
    // option forced0:  first hand with forced Display
    html +=  `<option value="${forceHandOneDisplaySelectValue}" ${hand === 0 && forcedDisplay ? 'selected' : ''}>1</option>`
    // the rest
    for(let i = 1; i < this.maxHand; i++) {
      html += `<option value="${i}" ${hand===i ? 'selected' : ''}>${i+1}</option>`
    }
    return html
  }

  isSiglumSelectedInWitnessData(index) {
    if (index > this.sigla.length - 1 || index < 0) {
      return false
    }

    let siglumData = this.witnessData.filter( (data) => { return data.witnessIndex === index})
    return siglumData.length > 0
  }

  getSiglumHandInWitnessData(index) {
    if (index > this.sigla.length - 1 || index < 0) {
      return 0
    }
    let siglumData = this.witnessData.filter( (data) => { return data.witnessIndex === index})
    return siglumData.length === 0 ? 0 : siglumData[0].hand
  }

  isHandDisplayForcedInWitnessData(index) {
    if (index > this.sigla.length - 1 || index < 0) {
      return 0
    }
    let siglumData = this.witnessData.filter( (data) => { return data.witnessIndex === index})
    return siglumData.length === 0 ? false : siglumData[0].forceHandDisplay
  }
}