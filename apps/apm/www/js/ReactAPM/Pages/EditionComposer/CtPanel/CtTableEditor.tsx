import {useEffect, useId, useRef} from 'react';
import {CtDataInterface} from '@/CtData/CtDataInterface';
import {CollationTableSearchMatch} from '@/EditionComposer/CollationTableSearch';
import {isRtl} from '@/toolbox/Util';
import {
  ColumnClearSelectionEvent,
  ColumnSelectEvent,
  EditMode,
  TableEditor,
  ValueChangeReport
} from '@/pages/common/TableEditor/TableEditor';
import {CtCellHoverInfo, CtTableCellRenderer} from './CtTableCellRenderer';

export interface CtCellShift {
  witnessIndex: number;
  firstCol: number;
  lastCol: number;
  direction: 'left' | 'right';
  numCols?: number;
}

export interface CtTableEditorProps {
  ctData: CtDataInterface;
  renderer: CtTableCellRenderer;
  editMode: EditMode;
  showWitnessTitles: boolean;
  showNormalizations: boolean;
  searchMatches: CollationTableSearchMatch[];
  selectedSearchMatch: number;
  onShiftCells: (shift: CtCellShift) => void;
  onInsertColumn: (afterCol: number) => void;
  onDeleteColumn: (col: number) => void;
  onToggleGroup: (col: number, grouped: boolean) => void;
  onEditToken: (row: number, col: number, text: string) => void;
  onColumnSelection: (range: [number, number] | null) => void;
  onCellHover: (info: CtCellHoverInfo | null) => void;
}

export function CtTableEditor(props: CtTableEditorProps) {
  const id = `ct-table-editor-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const tableEditorRef = useRef<TableEditor<number> | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const rendererRef = useRef(props.renderer);
  rendererRef.current = props.renderer;

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const getRenderer = () => rendererRef.current;
    const getProps = () => propsRef.current;
    const redrawSearchHighlights = () => {
      const tableEditor = tableEditorRef.current;
      if (tableEditor !== null) {
        applySearchHighlights(tableEditor, container, getProps().searchMatches, getProps().selectedSearchMatch);
      }
    };
    let tableEditor: TableEditor<number>;
    tableEditor = new TableEditor<number>({
      id,
      textDirection: isRtl(getProps().ctData.lang) ? 'rtl' : 'ltr',
      redrawOnCellShift: false,
      showInMultipleRows: true,
      columnsPerRow: getProps().showWitnessTitles ? 10 : 15,
      rowDefinition: getRenderer().getRowDefinition(),
      drawTableInConstructor: false,
      getEmptyValue: () => -1,
      isEmptyValue: (row, col, value) => getRenderer().isEmpty(row, col, value),
      groupedColumns: getProps().ctData.groupedColumns,
      generateCellContent: (row, col, value) => getRenderer().generateCellContent(row, col, value),
      generateCellContentEditMode: (row, col, value) => getRenderer().generateCellContentEditMode(row, col, value),
      isCellEditable: (row, col, value) => getRenderer().isCellEditable(row, col, value),
      onCellEnterEditMode: (row, col): boolean => {
        getProps().onCellHover(null);
        return getRenderer().isCellEditable(row, col, tableEditor.getValue(row, col));
      },
      onCellConfirmEdit: (row, col, text): ValueChangeReport<number> => {
        getProps().onEditToken(row, col, text);
        return {valueChange: false, value: tableEditor.getValue(row, col)};
      },
      cellValidationFunction: (row, col, text) => getRenderer().validateCell(row, col, text),
      generateTableClasses: () => getRenderer().generateTableClasses(),
      generateCellClasses: (row, col, value) => getRenderer().generateCellClasses(row, col, value),
      canDeleteColumn: (col) => getRenderer().canDeleteColumn(col),
      onShiftCellsRequest: (row, firstCol, lastCol, direction, numCols) => {
        const witnessIndex = getRenderer().getWitnessIndexForRow(row);
        if (witnessIndex !== undefined) {
          getProps().onShiftCells({witnessIndex, firstCol, lastCol, direction, numCols});
        }
      },
      onColumnAddRequest: (afterCol) => getProps().onInsertColumn(afterCol),
      onColumnDeleteRequest: (col) => getProps().onDeleteColumn(col),
      onColumnGroupToggleRequest: (col, grouped) => getProps().onToggleGroup(col, grouped),
      onTableDrawnEventHandler: redrawSearchHighlights
    });
    tableEditorRef.current = tableEditor;

    const handleColumnSelect = (event: Event) => {
      const {from, to} = (event as CustomEvent<{from: number; to: number}>).detail;
      getProps().onColumnSelection([from, to]);
    };
    const handleColumnClear = () => getProps().onColumnSelection(null);
    const handleCellMouseOver = (event: MouseEvent) => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }
      const cell = event.target.closest<HTMLElement>('td.te-cell');
      if (cell === null) {
        return;
      }
      const cellIndex = tableEditor.getCellIndexFromElement(cell);
      if (cellIndex === null || tableEditor.isCellInEditMode(cellIndex.row, cellIndex.col)) {
        return;
      }
      getProps().onCellHover(getRenderer().getCellHoverInfo(cellIndex.row, cellIndex.col, cell));
    };
    const handleCellMouseOut = (event: MouseEvent) => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }
      const cell = event.target.closest<HTMLElement>('td.te-cell');
      const relatedTarget = event.relatedTarget;
      const relatedElement = relatedTarget instanceof Element ? relatedTarget : null;
      const enteredPopover = relatedElement?.closest('.ct-token-popover') !== null && relatedElement !== null;
      if (cell !== null && !enteredPopover && (!(relatedTarget instanceof Node) || !cell.contains(relatedTarget))) {
        getProps().onCellHover(null);
      }
    };

    container.addEventListener(ColumnSelectEvent, handleColumnSelect);
    container.addEventListener(ColumnClearSelectionEvent, handleColumnClear);
    container.addEventListener('mouseover', handleCellMouseOver);
    container.addEventListener('mouseout', handleCellMouseOut);
    tableEditor.redrawTable(true);

    return () => {
      container.removeEventListener(ColumnSelectEvent, handleColumnSelect);
      container.removeEventListener(ColumnClearSelectionEvent, handleColumnClear);
      container.removeEventListener('mouseover', handleCellMouseOver);
      container.removeEventListener('mouseout', handleCellMouseOut);
      tableEditorRef.current = null;
    };
  }, [id]);

  useEffect(() => {
    const tableEditor = tableEditorRef.current;
    if (tableEditor === null) {
      return;
    }
    props.renderer.setShowWitnessTitles(props.showWitnessTitles);
    props.renderer.setShowNormalizations(props.showNormalizations);
    props.renderer.setCtData(props.ctData);
    tableEditor.setOption('columnsPerRow', props.showWitnessTitles ? 10 : 15);
    tableEditor.setOption('textDirection', isRtl(props.ctData.lang) ? 'rtl' : 'ltr');
    tableEditor.setRowDefinition(props.renderer.getRowDefinition());
    tableEditor.setGroupedColumns(props.ctData.groupedColumns);
    tableEditor.setEditMode(props.editMode, false);
    tableEditor.redrawTable(true);
  }, [props.ctData, props.editMode, props.renderer, props.showNormalizations, props.showWitnessTitles]);

  useEffect(() => {
    const tableEditor = tableEditorRef.current;
    const container = containerRef.current;
    if (tableEditor !== null && container !== null) {
      applySearchHighlights(tableEditor, container, props.searchMatches, props.selectedSearchMatch);
    }
  }, [props.searchMatches, props.selectedSearchMatch]);

  return <div id={id} ref={containerRef} className="ct-table-editor"></div>;
}

function applySearchHighlights(
  tableEditor: TableEditor<number>,
  container: HTMLElement,
  matches: CollationTableSearchMatch[],
  selectedSearchMatch: number
): void {
  container.querySelectorAll('.search-match').forEach((cell) => cell.classList.remove('search-match', 'selected'));
  const matchingCells = new Set<string>();
  const selectedCells = new Set<string>();
  matches.forEach((match, matchIndex) => {
    for (let col = match.colFrom; col <= match.colTo; col++) {
      const key = `${match.row}:${col}`;
      matchingCells.add(key);
      if (matchIndex === selectedSearchMatch) {
        selectedCells.add(key);
      }
    }
  });
  container.querySelectorAll<HTMLElement>('td.te-cell').forEach((cell) => {
    const cellIndex = tableEditor.getCellIndexFromElement(cell);
    if (cellIndex === null) {
      return;
    }
    const key = `${cellIndex.row}:${cellIndex.col}`;
    if (matchingCells.has(key)) {
      cell.classList.add('search-match');
      if (selectedCells.has(key)) {
        cell.classList.add('selected');
      }
    }
  });
  if (selectedSearchMatch >= 0 && selectedSearchMatch < matches.length) {
    const selectedMatch = matches[selectedSearchMatch];
    tableEditor.showColumnRange(selectedMatch.colFrom, selectedMatch.colTo);
    const selectedCell = document.querySelector<HTMLElement>(tableEditor.getTdSelector(selectedMatch.row, selectedMatch.colFrom));
    if (selectedCell !== null && typeof selectedCell.scrollIntoView === 'function') {
      selectedCell.scrollIntoView({behavior: 'smooth', block: 'center'});
    }
  }
}