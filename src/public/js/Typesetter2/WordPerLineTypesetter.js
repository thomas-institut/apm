import { Typesetter2 } from './Typesetter2'
import { type } from 'jquery'

/**
 * A test typesetter that just prints every text token in its own line
 */

export class WordPerLineTypesetter extends Typesetter2 {

  constructor (lineSkip = 24) {
    super()
    this.lineSkip = lineSkip
  }

  typesetTokens (tokensToTypeset) {
    let currentLine = 0
    return tokensToTypeset.map( (token) => {
      switch(token.constructor.name) {
        case 'Glue':
          return token.setX(0). setY(currentLine*this.lineSkip)._markAsSet()

        case 'TextBox':
          currentLine++
          return token.setX(0).setY(currentLine*this.lineSkip)._markAsSet()

        default:
          return token._markAsSet()
      }
    })
  }
}