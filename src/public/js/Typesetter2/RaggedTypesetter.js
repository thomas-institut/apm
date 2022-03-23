
import { Typesetter2 } from './Typesetter2'

export class RaggedTypesetter extends Typesetter2 {

  constructor (lineWidth, lineSkip = 24) {
    super()
    this.lineWidth = lineWidth
    this.lineSkip = lineSkip
  }


  typesetTokens (tokensToTypeset) {
    let currentLine = 1
    let currentX = 0
    return tokensToTypeset.map( (token) => {
      switch(token.constructor.name) {
        case 'Glue':
          token.setX(currentX). setY(currentLine*this.lineSkip)._markAsSet()
          currentX  = currentX + token.getWidth()
          return token

        case 'TextBox':
        case 'Box':
          if ((currentX + token.getWidth()) > this.lineWidth) {
            currentLine++
            token.setX(0).setY(currentLine*this.lineSkip)._markAsSet()
            currentX  = token.getWidth()
            return token
          }
          token.setX(currentX).setY(currentLine*this.lineSkip)._markAsSet()
          currentX = currentX + token.getWidth()
          return token


        default:
          return token._markAsSet()
      }
    })
  }
}