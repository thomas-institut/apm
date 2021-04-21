
import { ArrayToTable } from '../../../js/toolbox/ArrayToTable'

$( () => {
  const selector = '#the-table'

  const numItems = 150

  let data = []
  for (let i = 0; i < numItems; i++) {
    data.push(Math.round(Math.random()*10000))
  }

  let a2t = new ArrayToTable({
    data: data,
    itemsPerRow: 9,
    tableClasses: [ 'number-table'],
    getTdClasses: (item, index) => {
      let rank = Math.floor(item/1000)
      return [ 'item', 'rank-' + rank, 'item-' + index]
    },
    getTrClasses:  (row, firstItemIndex) => {
       if (row % 2 ) {
         return [ 'odd-row']
       }
       return ['even-row']
    }
  })

  $(selector).html(a2t.render())
})