
import {OptionsChecker} from '@thomas-inst/optionschecker'
import * as FmtTextTokenType from './FmtTextTokenType'
import * as FontStyle from './FontStyle'
import * as FontWeight from './FontWeight'
import * as VerticalAlign from './VerticalAlign'


export class HtmlRenderer {

  constructor (options = {}) {

    let optionsSpec = {
      tokenClasses: { type: 'array', default: [ 'token']},
      tokenIndexClassPrefix: { type: 'string', default: 'token-'},
      textClasses: { type: 'array', default: ['text']},
      glueClasses: { type: 'array', default: ['glue']}
    }

    let oc = new OptionsChecker(optionsSpec, 'FmtText Html Renderer')

    this.options = oc.getCleanOptions(options)

  }

  /**
   *
   * @param {FmtTextToken[] } fmtText
   * @return {string}
   */
  render(fmtText) {
    return fmtText.map((t, i) => {
      let tokenClasses = this.options.tokenClasses
      let classes  = []
      switch(t.type) {
        case FmtTextTokenType.GLUE:
          tokenClasses = tokenClasses.concat(this.options.glueClasses)
          classes  = getClassArrayForToken(this.options.tokenIndexClassPrefix, i, tokenClasses)
          if (classes.length === 0) {
            return ' '
          }
          return `<span class="${classes.join(' ')}"> </span>`

        case FmtTextTokenType.TEXT :
          tokenClasses = tokenClasses.concat(this.options.textClasses)
          classes  = getClassArrayForToken(this.options.tokenIndexClassPrefix, i, tokenClasses)
          let spanStart = ''
          let spanEnd = ''
          if (classes.length !== 0) {
            spanStart = `<span class="${classes.join(' ')}">`
            spanEnd = '</span>'
          }
          let textWrappers = []
          if (t.fontStyle === FontStyle.ITALIC) {
            textWrappers.push('i')
          }
          if (t.fontWeight === FontWeight.BOLD) {
            textWrappers.push('b')
          }
          if (t.verticalAlign === VerticalAlign.SUPERSCRIPT) {
            textWrappers.push('sup')
          }
          if (t.verticalAlign === VerticalAlign.SUBSCRIPT) {
            textWrappers.push('sub')
          }
          let startWrappers = ''
          for (let j = 0; j < textWrappers.length; j++) {
            startWrappers += `<${textWrappers[j]}>`
          }
          let endWrappers = ''
          for (let j = textWrappers.length -1; j >= 0; j--) {
            endWrappers += `</${textWrappers[j]}>`
          }
          return `${spanStart}${startWrappers}${t.text}${endWrappers}${spanEnd}`
      }
    }).join('')

  }

}

/**
 *
 * @param {string} indexPrefix
 * @param {number} index
 * @param {string[]} tokenClasses
 * @return {string[]}
 */
function getClassArrayForToken(indexPrefix, index, tokenClasses) {
  let indexClass = indexPrefix !== '' ? `${indexPrefix}${index}` : ''
  let classArray = []
  if (tokenClasses !== []) {
    classArray = classArray.concat(tokenClasses)
  }
  if (indexClass !== '') {
    classArray.push(indexClass)
  }
  return classArray

}