/*
 *  Copyright (C) 2020 Universität zu Köln
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



/*
   A generic table editor that allows for operations suitable for
   editing a collation table. The class takes a matrix with values
   and creates a set of tables that can be edited as a whole:
    - a cell can be moved to the left or to the right provided there's an
      empty cell where it will go
    - new columns can be created adding empty cells
    - columns with empty values can be deleted

   The editor is agnostic to actual matrix values as it can be provided with functions
   to generate the table's contents and to detect empty values

 */


class TableEditor {

  constructor(options) {

    //console.log("Constructing TableEditor")
    let thisObject = this

    let optionsDefinition = {
      rowDefinition: {
        // data definition: rows and values, see definition below
        // TableEditor is agnostic to the value types
        required: true,
        type: 'Array'
      },
      id: {
        // the html id of the container where the table will appear
        required: true,
        type: 'string'
      },
      textDirection: {
        type: 'string',
        required: false,
        default: 'ltr'
      },
      showInMultipleRows: {
        // if true, the table will be split and shown in multiple
        // tables of  the number of rows given in options.columnsPerRow
        required: false,
        type: 'boolean',
        default: false
      },
      columnsPerRow: {
        // columns to show per row if options.showInMultipleRows is true
        required: false,
        type: 'number',
        default: 10
      },
      drawTableInConstructor: {
        // if false, the table will not be drawn in the constructor,
        // the user would have to redraw it manually later.
        // If the user attaches event handlers that reference the TableEditor
        // drawing the table before the object is constructed will cause
        // an error. Setting this option to false avoids that.
        required: false,
        type: 'boolean',
        default: true
      },
      generateCellContent: {
        // a function to be called to generate the html content of a table cell
        // the default function simply prints the value if it's not empty
        required: false,
        type: 'function',
        default: function (row,col,value) {
          if (thisObject.options.isEmptyValue(value)) {
            return thisObject.options.emptyCellHtml
          }
          return value
        }
      },
      onCellDrawnEventHandler: {
        required: false,
        type: 'function',
        default: null
      },
      onTableDrawnEventHandler: {
        required: false,
        type: 'function',
        default: null
      },
      onContentChangedEventHandler: {
        required: false,
        type: 'function',
        default: null
      },
      generateTableClasses: {
        // a function to generate classes for the collation table
        // the default function is an emtpy array
        required: false,
        type: 'function',
        default: function () {
          return []
        }
      },
      generateCellClasses: {
        // a function to generate an array of html classes for a table cell
        // the default function returns an empty array
        required: false,
        type: 'function',
        default : function(row, col, value) {
          return [];
        }
      },
      generateCellTdExtraAttributes : {
        // a function to generate html attributes to be included in a cell's
        // td element.
        // This can be used to generate Bootstrap popover data for a cell,
        // by returning 'data-content="popover text"'
        required: false,
        type: 'function',
        default: function(row, col, value) {
          return ''
        }
      },
      getEmptyValue: {
        // a function to get an empty value
        required: false,
        type: 'function',
        default: function() {
          return ''
        }
      },
      isEmptyValue: {
        // a function to test whether a table value is empty
        // the default function returns true if the value is an empty string
        required: false,
        type: 'function',
        default: function (value) {
          return value === ''
        }
      },
      emptyCellHtml: {
        // html to use as the content of an empty cell
        required: false,
        type: 'string',
        default: '&mdash;'
      },
      icons: {
        // html for the different icons, see genTextIconSet() below
        required: false,
        type: 'object',
        default: this.genTextIconSet()
      }
    }

    let rowObjectDefinition = {
      title : {
        type: 'string',
        required: false,
        default: ''
      },
      isEditable: {
        type: 'boolean',
        required: false,
        default: false
      },
      values : {
        type: 'Array',
        required: true
      }
    }

    let optionsChecker = new OptionsChecker(optionsDefinition, 'TableEditor')
    this.options = optionsChecker.getCleanOptions(options)
    //console.log('Table options')
    //console.log(this.options)

    this.rowDefinition = []
    let valueArray = []
    for (let i=0; i < this.options.rowDefinition.length; i++) {
      let dataChecker = new OptionsChecker(rowObjectDefinition, 'dataElement ' + i)
      let cleanRowDefinition = dataChecker.getCleanOptions(this.options.rowDefinition[i])
      this.rowDefinition.push(cleanRowDefinition)
      valueArray.push(cleanRowDefinition.values)
    }

    this.matrix = new Matrix(0,0, this.options.getEmptyValue())
    this.matrix.setFromArray(valueArray)
    //this.matrix.logMatrix('TableEditor ' + this.options.id)

    this.editFlagMatrix = new Matrix(this.matrix.nRows, this.matrix.nCols, false)

    this.container = $('#' + this.options.id)
    this.icons = this.options.icons
    this.tableEditMode = false

    if (this.options.onCellDrawnEventHandler !== null) {
      this.on('cell-drawn', this.options.onCellDrawnEventHandler )
    }

    if (this.options.onTableDrawnEventHandler !== null) {
      this.on('table-drawn', this.options.onTableDrawnEventHandler )
    }

    if (this.options.onContentChangedEventHandler !== null) {
      this.on('content-changed', this.options.onContentChangedEventHandler )
    }
    if (this.options.drawTableInConstructor) {
      this.redrawTable()
    }

    //console.log("Finished constructing TableEditor")
  }

  getValue(row, col) {
    return this.matrix.getValue(row, col)
  }

  setValue(row, col, value) {
    this.matrix.setValue(row, col, value)
  }

  getRow(row) {
    return this.matrix.getRow(row)
  }

  getColumn(col) {
    return this.matrix.getColumn(col)
  }

  getMatrix() {
    return this.matrix
  }

  getRowTitle(row) {
    return this.rowDefinition[row].title
  }

  isTableInEditMode() {
    return this.tableEditMode
  }

  toggleTableEditMode() {
    this.tableEditMode = !this.tableEditMode
    this.redrawTable()
    if (this.tableEditMode) {
      this.container.addClass('table-edit-mode')
    } else {
      this.container.removeClass('table-edit-mode')
    }
  }

  editModeOn(redraw = true) {
    this.tableEditMode = true
    this.container.addClass('table-edit-mode')
    if (redraw) {
     this.redrawTable()
    }
  }

  isTableShownInMultipleRows() {
    return this.options.showInMultipleRows;
  }

  showInMultipleRows(numCols = -1, redrawIfNeeded = true) {
    let redrawRequired = false

    if (!this.options.showInMultipleRows) {
      redrawRequired = true
    }
    let newNumCols = this.options.columnsPerRow
    if (numCols >= 5) {
      newNumCols = numCols
      if (newNumCols !== this.options.columnsPerRow) {
        redrawRequired = true
      }
    }
    this.options.showInMultipleRows = true
    this.options.columnsPerRow = newNumCols
    if (redrawIfNeeded && redrawRequired) {
      this.redrawTable()
    }
  }

  showInSingleRow(redrawIfNeeded = true) {
    let redrawRequired = false
    if (this.options.showInMultipleRows) {
      redrawRequired = true
    }
    this.options.showInMultipleRows = false
    if (redrawIfNeeded && redrawRequired) {
      this.redrawTable()
    }
  }

  genTextIconSet() {
    return {
      moveCellLeft: '&#x25c1;',
      moveCellRight: '&#x25b7;',
      editCell: '&#x270D;',
      addColumnLeft: '<sup>&#x25c3;</sup>+',
      addColumnRight: '+<sup>&#x25b9;',
      deleteColumn: '&#x2715;',
      confirmCellEdit: '<small>OK</small>',
      cancelCellEdit: '<small>Cancel</small>'
    }
  }

  redrawTable() {
    //console.log("Redrawing table")
    let profiler = new SimpleProfiler('TableRedraw')
    this.dispatchTableDrawnPreEvent()

    this.container.html(this.generateTable())
    //profiler.lap('GenTable')
    this.setupTableEventHandlers()
    //profiler.lap('SetupEventHandlers')
    // dispatch redraw callbacks
    for(let row = 0; row < this.matrix.nRows; row++) {
      for (let col = 0; col < this.matrix.nCols; col++) {
        this.dispatchCellDrawnEvent(row, col)
      }
    }
    this.dispatchTableDrawnEvent()
    profiler.stop()
  }

  generateTable() {
    let html = ''

    let numTables = 1
    let columnsPerTable = this.matrix.nCols
    if (this.options.showInMultipleRows) {
      numTables = Math.ceil(this.matrix.nCols / this.options.columnsPerRow)
      columnsPerTable = this.options.columnsPerRow
    }

    for(let tableNumber = 0; tableNumber < numTables; tableNumber++) {

      let currentTableFirstColumn  = tableNumber * columnsPerTable
      let currentTableLastColumnPlusOne = Math.min(this.matrix.nCols, currentTableFirstColumn + columnsPerTable)
      let tableClasses = [ "te-table", this.getTableClass(tableNumber)].concat(this.options.generateTableClasses())

      html += '<table class="' +  tableClasses.join(' ') + '">'
      html += '<tr class="te-tableheader">'
      html += '<th></th>'
      for (let col=currentTableFirstColumn; col < currentTableLastColumnPlusOne; col++) {
        html += '<th class="'+ this.getThClass(col)  +'">'
        let addColumnBeforeIcon = this.options.textDirection === 'ltr' ? this.icons.addColumnLeft : this.icons.addColumnRight
        let addColumnAfterIcon = this.options.textDirection === 'ltr' ? this.icons.addColumnRight : this.icons.addColumnLeft
        if (this.tableEditMode) {
          html += this.genButtonHtml(addColumnBeforeIcon, ['add-column-left-button', 'header-button'], 'Add column before')
        }

        html += (col + 1)
        if (this.tableEditMode) {
          html += this.genButtonHtml(this.icons.deleteColumn, ['delete-column-button', 'header-button'], 'Delete this column')
          html += this.genButtonHtml(addColumnAfterIcon, ['add-column-right-button', 'header-button'], 'Add column after')
        }
        html += '</th>'
      }

      html += '</tr>'
      for (let row = 0; row < this.matrix.nRows; row++) {
        html += '<tr class="te-tablerow te-tr-' + row + '">'
        html += '<td class="te-rowtitle">' + this.rowDefinition[row].title + '</td>'
        for (let col = currentTableFirstColumn; col < currentTableLastColumnPlusOne; col++) {
          html += this.generateCellHtml(row, col)
        }
        html += '</tr>'
      }
      html += '</table>'
    }
    return html
  }

  generateCellHtml(row, col) {
    let html = ''
    let value = this.matrix.getValue(row, col)
    let cellClasses = [ 'te-cell', this.getTdClass(row,col)]
    cellClasses = cellClasses.concat(this.options.generateCellClasses(row, col, value ))
    let tdExtra = this.options.generateCellTdExtraAttributes(row, col, value )
    html += '<td class="' +  cellClasses.join(' ') + '" ' + tdExtra + '>'
    html += this.generateTdHtml(row, col)
    html += '</td>'
    return html
  }

  isRowEditable(row) {
    return this.rowDefinition[row].isEditable
  }

  generateTdHtml(row, col) {
    let html = ''
    let moveCellBackwardIcon = this.options.textDirection === 'ltr' ? this.icons.moveCellLeft :  this.icons.moveCellRight
    let moveCellForwardIcon = this.options.textDirection === 'ltr' ? this.icons.moveCellRight :  this.icons.moveCellLeft
    if (this.tableEditMode) {
      html += this.genButtonHtml(moveCellBackwardIcon, [ 'move-cell-left-button', 'cell-button' ], 'Move backward')
    }
    html += '<span class="te-cell-content">'
    html += this.options.generateCellContent(row,col, this.matrix.getValue(row,col))
    html += '</span>'
    if (this.tableEditMode && this.isRowEditable(row)) {
      html += this.genButtonHtml(this.icons.editCell, [ 'edit-cell-button', 'cell-button' ] , 'Edit')
    }
    if (this.tableEditMode) {
      html += this.genButtonHtml(moveCellForwardIcon, [ 'move-cell-right-button' , 'cell-button' ] , 'Move forward')
    }
    return html
  }

  generateTdHtmlCellEditMode(row, col) {
    let html  = ''
    let value = this.getValue(row, col)
    html += '<input type="text" class="te-input" value="' + value + '" ' + 'size="' + value.length + '">'
    html += this.genButtonHtml(this.icons.confirmCellEdit, ['confirm-edit-button'], 'Confirm edit')
    html += this.genButtonHtml(this.icons.cancelCellEdit, ['cancel-edit-button'], 'Cancel edit')
    return html
  }

  setupTableEventHandlers() {
    //let profiler = new SimpleProfiler('SetupEventHandlers')

    let thSelector = this.getThSelectorAll()

    if (this.tableEditMode) {
      $(thSelector).on('mouseenter', this.genOnMouseEnterHeader())
      $(thSelector).on('mouseleave', this.genOnMouseLeaveHeader())
      $(thSelector + ' .add-column-left-button').on('click', this.genOnClickAddColumnLeftButton())
      $(thSelector + ' .add-column-right-button').on('click', this.genOnClickAddColumnRightButton())
      $(thSelector + ' .delete-column-button').on('click', this.genOnClickDeleteColumnButton())
    }
    $(thSelector + ' .header-button').addClass('hidden')

    //profiler.lap('ColumnHandlers')
    this.setupCellEventHandlersAll()
    for (let row = 0; row < this.matrix.nRows; row++) {
      for (let col = 0; col < this.matrix.nCols; col++) {
       this.setupCellEventHandlers(row, col)
      }
    }
    //profiler.stop()
  }
  setupCellEventHandlersAll() {
    let tdSelector = this.getTdSelectorAll()
    //console.log('Setting up cell event handlers, selector: "' + tdSelector + '"')
    $(tdSelector).off()
    $(tdSelector).on('click', this.genOnClickCell())
    if (this.tableEditMode) {
      $(tdSelector).on('mouseenter', this.genOnMouseEnterCell())
      $(tdSelector).on('mouseleave', this.genOnMouseLeaveCell())
      //if (this.isRowEditable(row)) {
      //   $(tdSelector).on('click', this.genOnClickEditableCell(row, col))
      // }
    }
    $(tdSelector + ' .cell-button').addClass('hidden')
  }


  genOnClickCell() {
    let thisObject = this
    return function(ev) {
      if (!thisObject.tableEditMode) {
        return true
      }
      let cellIndex = thisObject.getCellIndexFromElement($(ev.currentTarget))
      if (cellIndex === null) {
        return true
      }
      let row = cellIndex.row
      let col = cellIndex.col

      //console.log('Edit mode click on cell ' + row + ':' + col)
      // console.log(ev.target)
      let elementClasses = thisObject.getClassList($(ev.target))

      if (elementClasses.indexOf('move-cell-left-button') !== -1) {
        // move cell left
        console.log('move cell left button clicked')
        if(thisObject.canMoveCellLeft(row, col)) {
          //console.log('Moving cell ' + row + ':' + col + ' left')
          // move values in matrix
          thisObject.dispatchCellMoveEvents('pre', 'left', row, col)
          thisObject.matrix.setValue(row, col-1, thisObject.matrix.getValue(row, col))
          thisObject.matrix.setValue(row, col, thisObject.options.getEmptyValue())

          // refresh html table cells
          thisObject.redrawCell(row, col-1)
          thisObject.redrawCell(row, col)

          // setup cell button handlers
          thisObject.setupCellEventHandlers(row,col-1)
          thisObject.setupCellEventHandlers(row,col)

          // dispatch cell redrawn events
          thisObject.dispatchCellDrawnEvent(row, col-1)
          thisObject.dispatchCellDrawnEvent(row, col)

          // post move events
          thisObject.dispatchCellMoveEvents('post', 'left', row, col)
        }
      }

      if (elementClasses.indexOf('move-cell-right-button') !== -1) {
        // move cell right
        console.log('move cell right button clicked')
        if(thisObject.canMoveCellRight(row, col)) {
          console.log('Moving cell ' + row + ':' + col + ' right')
          thisObject.dispatchCellMoveEvents('pre', 'right', row, col)
          // move values in matrix
          thisObject.matrix.setValue(row, col+1, thisObject.matrix.getValue(row, col))
          thisObject.matrix.setValue(row, col, thisObject.options.getEmptyValue())
          // refresh html table cells
          thisObject.redrawCell(row, col+1)
          thisObject.redrawCell(row, col)

          // setup cell button handlers
          thisObject.setupCellEventHandlers(row,col)
          thisObject.setupCellEventHandlers(row,col+1)
          // dispatch cell redrawn events
          thisObject.dispatchCellDrawnEvent(row, col)
          thisObject.dispatchCellDrawnEvent(row, col+1)
          // post move events
          thisObject.dispatchCellMoveEvents('post', 'right', row, col)
        }
      }

      if (elementClasses.indexOf('edit-cell-button') !== -1) {
        //edit cell
        console.log('Edit cell button clicked')
        //console.log('Edit cell button clicked on row ' + row + ' col ' + col)
        thisObject.enterCellEditMode(row, col)
      }
      return false
    }
  }

  setupCellEventHandlers(row, col) {
    let tdSelector = this.getTdSelector(row, col)
    //$(tdSelector).off()
    if (this.tableEditMode) {
      if (this.isRowEditable(row)) {
        $(tdSelector).on('click', this.genOnClickEditableCell(row, col))
      }
    }
  }

  setupCellEventHandlersCellEditMode(row, col) {
    let tdSelector = this.getTdSelector(row, col)
    $(tdSelector).off()
    $(tdSelector + ' .cancel-edit-button').on('click', this.genOnClickCancelEditButton(row, col))
    $(tdSelector + ' .confirm-edit-button').on('click', this.genOnClickConfirmEditButton(row, col))
    $(tdSelector + ' .te-input').on('keydown', this.genOnKeyPressCellInputField(row, col))
  }


  genButtonHtml(icon, classes, title='') {
    return '<a href="#" class="' + classes.join(' ') + '" title="'+ title + '">' + icon + '</a>'
  }

  genOnKeyPressCellInputField(row, col) {
    let thisObject = this
    return function(ev) {
      if (ev.which === 13) {
        // Enter key
        let newValue = $(thisObject.getTdSelector(row, col) + ' .te-input').val()
        thisObject.setValue(row, col, newValue)
        thisObject.leaveCellEditMode(row, col)
        thisObject.dispatchContentChangedEvent(row, col)
        return false
      }
      if (ev.which === 27) {
        // Escape key
        thisObject.leaveCellEditMode(row, col)
        return false
      }
      return true
    }
  }

   getClassList(element) {
    if (element.attr('class') === undefined) {
      return []
    }
    return element.attr("class").split(/\s+/)
  }

  getThIndexFromElement(element) {
    let thIndex = -1
    let classes = this.getClassList(element)
    for(const theClass of classes) {
      if (theClass.search(/^te-th-/) !== -1) {
        thIndex = parseInt(theClass.replace('te-th-', ''))
        break
      }
    }
    return thIndex
  }

  getCellIndexFromElement(element) {
    let cellIndex = null
    let classes = this.getClassList(element)
    for(const theClass of classes) {
      if (theClass.search(/^te-cell-/) !== -1) {
        let cellIndexArray = theClass.replace('te-cell-', '').split('-')
        if (cellIndexArray.length !== 2) {
          console.error('Found cell class with invalid cell index, class: ' +  theClass)
          break
        }
        cellIndex = {
          row: parseInt(cellIndexArray[0]),
          col: parseInt(cellIndexArray[1])
        }
        break
      }
    }
    return cellIndex
  }

  genOnMouseEnterHeader() {
    let thisObject = this
    return function(ev) {
      //console.log('Mouse enter')
      let col = thisObject.getThIndexFromElement($(ev.currentTarget))
      if (col !== -1) {
        let thSelector = thisObject.getThSelector(col)

        $(thSelector + ' .add-column-left-button').removeClass('hidden')
        $(thSelector + ' .add-column-right-button').removeClass('hidden')
        if (thisObject.matrix.isColumnEmpty(col, thisObject.options.isEmptyValue)) {
          $(thSelector + ' .delete-column-button').removeClass('hidden')
        }
      }
    }
  }

  genOnMouseLeaveHeader() {
    let thisObject = this
    return function(ev) {
      //console.log('Mouse leave')
      let col = thisObject.getThIndexFromElement($(ev.currentTarget))
      if (col !== -1) {
        $(thisObject.getThSelector(col) + ' .header-button').addClass('hidden')
      }
    }
  }

  genOnMouseEnterCell() {
    let thisObject = this
    return function(ev) {
      let cellIndex = thisObject.getCellIndexFromElement($(ev.currentTarget))
      if (cellIndex === null) {
        return true
      }
      let row = cellIndex.row
      let col = cellIndex.col
      //console.log('Mouse enter cell ' + row + ':' + col)
      let tdSelector = thisObject.getTdSelector(row, col)
      if (thisObject.canMoveCellLeft(row, col)) {
        $(tdSelector +  ' .move-cell-left-button').removeClass('hidden')
      }
      if (thisObject.canMoveCellRight(row, col)) {
        $(tdSelector + ' .move-cell-right-button').removeClass('hidden')
      }
      if (thisObject.isRowEditable(row)) {
        $(tdSelector + ' .edit-cell-button').removeClass('hidden')
      }
    }
  }

  genOnMouseLeaveCell() {
    let thisObject = this
    return function(ev) {
      let cellIndex = thisObject.getCellIndexFromElement($(ev.currentTarget))
      if (cellIndex === null) {
        return true
      }
      let row = cellIndex.row
      let col = cellIndex.col
      //console.log('Mouse leave cell ' + row + ':' + col)
      $(thisObject.getTdSelector(row, col) + ' .cell-button').addClass('hidden')
    }
  }

  redrawCell(row, col) {
    //$(this.getTdSelector(row, col)).html(this.generateTdHtml(row, col))
    let tdSelector = this.getTdSelector(row, col)
    $(tdSelector).replaceWith(this.generateCellHtml(row,col))
    // re-establish the cell's event handlers
    $(tdSelector).on('click', this.genOnClickCell())
    if (this.tableEditMode) {
      $(tdSelector).on('mouseenter', this.genOnMouseEnterCell())
      $(tdSelector).on('mouseleave', this.genOnMouseLeaveCell())
      //if (this.isRowEditable(row)) {
      //   $(tdSelector).on('click', this.genOnClickEditableCell(row, col))
      // }
    }
    $(tdSelector + ' .cell-button').addClass('hidden')

  }

  redrawColumn(col) {
    for(let row = 0; row < this.matrix.nRows; row++) {
      this.redrawCell(row, col)
    }
  }

  enterCellEditMode(row, col) {
    //console.log('Entering edit mode, ' + row + ':' + col)
    let tdSelector = this.getTdSelector(row, col)
    let inputSelector = tdSelector + ' .te-input'
    this.editFlagMatrix.setValue(row, col, true)
    $(tdSelector).html(this.generateTdHtmlCellEditMode(row, col))
    this.setupCellEventHandlersCellEditMode(row, col)
    $(inputSelector).on('focus', function() {
      $(inputSelector).get(0).setSelectionRange(10000, 10000)
    })
    $(inputSelector).get(0).focus()
  }

  leaveCellEditMode(row, col) {
    //console.log('Leaving edit mode, ' + row + ':' + col)
    let tdSelector = this.getTdSelector(row, col)
    this.editFlagMatrix.setValue(row, col, false)
    $(tdSelector).html(this.generateTdHtml(row, col))
    this.setupCellEventHandlers(row,col)
    $(tdSelector).on('click', this.genOnClickEditableCell(row, col))
    this.dispatchCellDrawnEvent(row, col)
  }


  genOnClickEditableCell(row, col) {
    let thisObject = this
    return function() {
      //console.log('Editable cell clicked, row ' + row + ' col ' + col)
      thisObject.enterCellEditMode(row, col)
      return false
    }
  }

  genOnClickCancelEditButton(row, col) {
    let thisObject = this
    return function() {
      //console.log('Cancel edit button clicked')
      thisObject.leaveCellEditMode(row, col)
      return false
    }
  }

  genOnClickConfirmEditButton(row, col) {
    let thisObject = this
    return function() {
      //console.log('Confirm edit button clicked')
      let newValue = $(thisObject.getTdSelector(row, col) + ' .te-input').val()
      thisObject.setValue(row, col, newValue)
      thisObject.leaveCellEditMode(row, col)
      thisObject.dispatchContentChangedEvent(row, col)
      return false
    }
  }

  genOnClickAddColumnRightButton() {
    let thisObject = this
    return function(ev) {
      let col = thisObject.getThIndexFromElement($(ev.currentTarget).parent())
      if (col === -1) {
        return true
      }
      console.log('Add column right, col = ' + col)
      thisObject.matrix.addColumnAfter(col,  thisObject.options.getEmptyValue())
      thisObject.dispatchColumnAddEvents(col+1)
      thisObject.redrawTable()
    }
  }

  genOnClickAddColumnLeftButton() {
    let thisObject = this
    return function(ev) {
      let col = thisObject.getThIndexFromElement($(ev.currentTarget).parent())
      if (col === -1) {
        return true
      }
      //console.log('Adding column LEFT')
      console.log('Add column left, col = ' + col)
      thisObject.matrix.addColumnAfter(col-1, thisObject.options.getEmptyValue())
      thisObject.dispatchColumnAddEvents(col)
      thisObject.redrawTable()
    }
  }

  genOnClickDeleteColumnButton() {
    let thisObject = this
    return function(ev) {
      let col = thisObject.getThIndexFromElement($(ev.currentTarget).parent())
      if (col === -1) {
        return true
      }
      if (thisObject.matrix.isColumnEmpty(col, thisObject.options.isEmptyValue)) {
        //console.log('Deleting column ' + col)
        thisObject.matrix.deleteColumn(col)
        thisObject.redrawTable()
        thisObject.dispatchColumnDeleteEvents(col)
      } else {
        console.log('Column NOT empty, cannot delete')
      }

    }
  }

  getTableClass(tableNumber) {
    return 'te-table-' + tableNumber
  }
  getTdClass(row, col) {
    return 'te-cell-' + row + '-' + col
  }

  getThClass(col) {
    return 'te-th-' + col
  }

  getTdSelector(row, col) {
    return '#' + this.options.id + ' .' + this.getTdClass(row,col)
  }

  getTdSelectorAll() {
    return '#' + this.options.id + ' .te-cell'
  }

  getThSelector(col) {
    return '#' + this.options.id + ' .' + this.getThClass(col)
  }

  getThSelectorAll() {
    return '#' + this.options.id + ' .te-table th'
  }

  getCellContentSelector(row, col) {
    return this.getTdSelector(row, col) + ' .te-cell-content'
  }


  canMoveCellLeft(row, col) {
    return col!== 0 &&
      !this.options.isEmptyValue(this.matrix.getValue(row, col)) &&
      this.options.isEmptyValue(this.matrix.getValue(row, col-1));
  }

  canMoveCellRight(row, col) {
    return  col !== (this.matrix.nCols - 1) &&
      !this.options.isEmptyValue(this.matrix.getValue(row, col)) &&
      this.options.isEmptyValue(this.matrix.getValue(row, col+1));
  }

  dispatchCellDrawnEvent(row, col) {
    this.dispatchEvent(
      'cell-drawn',
      {
        row: row,
        col: col,
        selector: this.getCellContentSelector(row, col)
      }
    )
  }
  dispatchTableDrawnEvent() {
    this.dispatchEvent('table-drawn', {})
  }

  dispatchTableDrawnPreEvent() {
    this.dispatchEvent('table-drawn-pre', {})
  }

  dispatchColumnDeleteEvents(deletedColumn) {
    this.dispatchEvent('column-delete', {
      col: deletedColumn,
    })
  }

  dispatchColumnAddEvents(newCol) {
    this.dispatchEvent('column-add', {
      col: newCol,
    })
  }

  dispatchCellMoveEvents(type, direction, row, col) {
    let selector = this.getTdSelector(row, col)
    // 1st event: specific type/direction
    this.dispatchEvent('cell-' + type + '-move-' + direction, {
      row: row,
      col: col,
      selector: selector
    })
    // 2nd event: generic type, cell-pre-move or cell-post-move
    this.dispatchEvent('cell-' + type + '-move', {
      row: row,
      col: col,
      selector: selector,
      direction: direction
    })

    // 3rd event: generic move: cell-move, only in post
    if (type==='post') {
      this.dispatchEvent('cell-move', {
        row: row,
        col: col,
        selector: selector,
        direction: direction,
        type: type
      })
    }

  }

  dispatchContentChangedEvent(row, col) {
    this.dispatchEvent(
      'content-changed',
      {
        row: row,
        col: col
      }
    )
  }

  dispatchEvent(eventName, data = {})
  {
    const event = new CustomEvent(eventName, {detail: data})
    this.container.get()[0].dispatchEvent(event)
  }

  /**
   * Attaches a callback function to an editor event
   *
   * @param {String} eventName
   * @param {function} f
   */
  on(eventName, f)
  {
    this.container.on(eventName, f)
  }


}