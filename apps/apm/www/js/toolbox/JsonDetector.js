


export class JsonDetector {

  /**
   *
   * @param {string}str
   * @return {JsonItem[]}
   */
  static getJsonItems(str) {
    let jsonItems = []
    let state = 0
    let jsonStartBracket = ''
    let jsonBracketLevel = 0
    let jsonItem = new JsonItem()
    str.split('').forEach( (ch, index) => {
      switch(state) {
        case 0:
          // looking for json item start
          if (ch === '{' || ch === '[') {
            jsonItem.startIndex = index
            jsonItem.jsonString = ch
            jsonBracketLevel = 1
            jsonStartBracket = ch
            state = 1
          }
          break

        case 1:
          // reading json
          let endBracketToMatch = jsonStartBracket === '[' ?  ']' : '}'
          jsonItem.jsonString += ch
          switch (ch) {
            case endBracketToMatch:
              jsonBracketLevel--
              if (jsonBracketLevel === 0) {
                // got a possible json string
                jsonItem.endIndex = index
                jsonItems.push(jsonItem)
                jsonItem = new JsonItem()
                state = 0
              }
              break

            case jsonStartBracket:
              jsonBracketLevel++
              break
          }
          break
      }
    })
    return jsonItems
  }
}

class JsonItem {
  constructor () {
    this.startIndex = -1
    this.endIndex = -1
    this.jsonString = ''
  }

}