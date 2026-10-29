import {HtmlRenderer} from '@thomas-inst/fmt-text';
import {PersonEssentialData} from '@/Api/DataSchema/ApiPeople';
import {CtData} from '@/CtData/CtData';
import {CtDataInterface, FullTxItemEditorialNote, FullTxItemInterface, NonTokenItemIndex} from '@/CtData/CtDataInterface';
import {Punctuation} from '@/defaults/Punctuation';
import {genVariantsMatrix} from '@/pages/common/CollationTableUtil';
import * as CollationTablePopovers from '@/pages/common/CollationTablePopovers';
import {CellValidationReport, RowDefinition} from '@/pages/common/TableEditor/TableEditor';
import {EditionWitnessTokenStringParser} from '@/toolbox/EditionWitnessTokenStringParser';
import * as WitnessTokenClass from '@/Witness/WitnessTokenClass';
import * as WitnessTokenType from '@/Witness/WitnessTokenType';
import {Matrix} from '@/lib/Matrix';

export interface CtCellHoverInfo {
  row: number;
  col: number;
  witnessIndex: number;
  tokenIndex: number;
  element: HTMLElement;
  html: string;
}

export class CtTableCellRenderer {
  private ctData: CtDataInterface;
  private showNormalizations = false;
  private showWitnessTitles = false;
  private highlightVariants = true;
  private peopleInfo: Record<number, PersonEssentialData> = {};
  private aggregatedNonTokenItemIndexes: NonTokenItemIndex[][];
  private variantsMatrix = new Matrix<number>(0, 0, -1);
  private tokenCache = new Map<string, string>();

  constructor(ctData: CtDataInterface) {
    this.ctData = ctData;
    this.aggregatedNonTokenItemIndexes = CtData.calculateAggregatedNonTokenItemIndexes(ctData);
    this.recalculateVariants();
  }

  setCtData(ctData: CtDataInterface): void {
    this.ctData = ctData;
    this.aggregatedNonTokenItemIndexes = CtData.calculateAggregatedNonTokenItemIndexes(ctData);
    this.tokenCache.clear();
    this.recalculateVariants();
  }

  setShowNormalizations(show: boolean): void {
    if (this.showNormalizations !== show) {
      this.showNormalizations = show;
      this.tokenCache.clear();
    }
  }

  setShowWitnessTitles(show: boolean): void {
    this.showWitnessTitles = show;
  }

  setHighlightVariants(highlight: boolean): void {
    this.highlightVariants = highlight;
  }

  setPeopleInfo(peopleInfo: Record<number, PersonEssentialData>): void {
    this.peopleInfo = peopleInfo;
    this.tokenCache.clear();
  }

  getRowDefinition(): RowDefinition<number>[] {
    return CtData.getCtRowWitnessIndexes(this.ctData).map((witnessIndex) => ({
      title: this.showWitnessTitles ? this.ctData.witnessTitles[witnessIndex] : this.ctData.sigla[witnessIndex],
      values: this.ctData.collationMatrix[witnessIndex],
      isEditable: this.ctData.type === 'edition' && witnessIndex === this.ctData.editionWitnessIndex
    }));
  }

  getWitnessIndexForRow(row: number): number | undefined {
    return CtData.getCtRowWitnessIndexes(this.ctData)[row];
  }

  generateCellContent(row: number, col: number, tokenIndex: number): string {
    if (tokenIndex === -1) {
      return '&mdash;';
    }
    const witnessIndex = this.getWitnessIndexForRow(row);
    const token = witnessIndex === undefined ? undefined : this.ctData.witnesses[witnessIndex]?.tokens[tokenIndex];
    if (token === undefined || witnessIndex === undefined) {
      return '???';
    }
    const cacheKey = this.getCacheKey('content', witnessIndex, tokenIndex);
    const cachedContent = this.tokenCache.get(cacheKey);
    if (cachedContent !== undefined) {
      return cachedContent;
    }

    let content = token.text;
    if (token.tokenClass === WitnessTokenClass.EDITION) {
      if (token.tokenType === WitnessTokenType.FORMAT_MARK) {
        content = token.markType === 'par_end' ? '&para;' : '???';
      } else if (token.tokenType === WitnessTokenType.NUMBERING_LABEL) {
        content = `<span class="numbering-label">${token.text}</span>`;
      } else if (token.text === '') {
        content = '&mdash;';
      } else if (token.fmtText !== undefined) {
        content = new HtmlRenderer({plainMode: true}).render(token.fmtText);
      }
    } else {
      const postNotes = this.getPostNotes(witnessIndex, tokenIndex);
      const sourceItems = token.sourceItems ?? [];
      if (sourceItems.length === 1 && postNotes.length === 0) {
        content = this.showNormalizations && token.normalizedText !== undefined
          ? `${token.normalizedText}<b><sub>N</sub></b>`
          : token.text;
      } else {
        content = sourceItems.flatMap((sourceItem) => {
          const item = this.ctData.witnesses[witnessIndex].items?.[sourceItem.index];
          if (item === undefined || item.type !== 'TextualItem') {
            return [];
          }
          const itemText = item.text?.substring(sourceItem.charRange.from, sourceItem.charRange.to + 1) ?? '';
          return itemText === '\n' ? [] : [`<span class="${this.getClassesFromItem(item).join(' ')}">${itemText.replace(/^\n/, '')}</span>`];
        }).join('');
        if (postNotes.length > 0) {
          content += ' <span class="noteicon"><i class="far fa-comment"></i></span>';
        }
      }
    }
    this.tokenCache.set(cacheKey, content);
    return content;
  }

  generateCellContentEditMode(row: number, _col: number, tokenIndex: number): string {
    if (tokenIndex === -1) {
      return '';
    }
    const witnessIndex = this.getWitnessIndexForRow(row);
    const token = witnessIndex === undefined ? undefined : this.ctData.witnesses[witnessIndex]?.tokens[tokenIndex];
    return token?.tokenClass === WitnessTokenClass.EDITION ? token.text : 'ERROR!';
  }

  generateCellClasses(row: number, col: number, tokenIndex: number): string[] {
    if (tokenIndex === -1) {
      return ['token-type-empty'];
    }
    const witnessIndex = this.getWitnessIndexForRow(row);
    const token = witnessIndex === undefined ? undefined : this.ctData.witnesses[witnessIndex]?.tokens[tokenIndex];
    if (token === undefined || witnessIndex === undefined) {
      return ['unknown'];
    }
    const classes = [`token-type-${token.tokenType}`, `token-class-${token.tokenClass}`];
    if (token.tokenClass === WitnessTokenClass.FULL_TX) {
      classes.push('withpopover');
      if (this.highlightVariants && this.variantsMatrix.nRows > row && this.variantsMatrix.nCols > col) {
        const variant = this.variantsMatrix.getValue(row, col);
        if (variant !== 0) {
          classes.push(`variant-${variant}`);
        }
      }
      const sourceItem = token.sourceItems?.[0];
      const item = sourceItem === undefined ? undefined : this.ctData.witnesses[witnessIndex].items?.[sourceItem.index];
      classes.push(`text-${item?.lang ?? this.ctData.witnesses[witnessIndex].lang ?? ''}`);
      if (token.sourceItems?.length === 1 && item !== undefined) {
        classes.push(...this.getClassesFromItem(item));
      }
    } else if (token.tokenClass === WitnessTokenClass.EDITION) {
      if (token.tokenType === WitnessTokenType.FORMAT_MARK) {
        classes.push(token.markType === 'par_end' ? 'paragraph-end' : 'unknown');
      } else {
        classes.push('withpopover', `text-${this.ctData.lang}`);
      }
    }
    return classes;
  }

  generateTableClasses(): string[] {
    return [`te-table-${this.ctData.lang}`];
  }

  isEmpty(row: number, _col: number, tokenIndex: number): boolean {
    if (tokenIndex === -1) {
      return true;
    }
    const witnessIndex = this.getWitnessIndexForRow(row);
    return witnessIndex !== undefined && this.ctData.witnesses[witnessIndex]?.tokens[tokenIndex]?.tokenType === WitnessTokenType.EMPTY;
  }

  canDeleteColumn(col: number): boolean {
    return CtData.canDeleteColumn(this.ctData, col);
  }

  isCellEditable(row: number, _col: number, tokenIndex: number): boolean {
    if (tokenIndex === -1 || this.ctData.type !== 'edition') {
      return false;
    }
    const witnessIndex = this.getWitnessIndexForRow(row);
    const token = witnessIndex === undefined ? undefined : this.ctData.witnesses[witnessIndex]?.tokens[tokenIndex];
    return witnessIndex === this.ctData.editionWitnessIndex && token !== undefined &&
      token.tokenType !== WitnessTokenType.FORMAT_MARK;
  }

  validateCell(row: number, col: number, currentText: string): CellValidationReport {
    const trimmedText = currentText.trim();
    if (EditionWitnessTokenStringParser.isWordToken(trimmedText)) {
      return {isValid: true, warnings: [], errors: []};
    }
    const witnessIndexes = CtData.getCtRowWitnessIndexes(this.ctData);
    const currentWitnessIndex = this.getWitnessIndexForRow(row);
    const punctuationAllowed = witnessIndexes.every((witnessIndex) => {
      if (witnessIndex === currentWitnessIndex) {
        return true;
      }
      const ref = this.ctData.collationMatrix[witnessIndex][col];
      return ref === undefined || ref === -1;
    });
    if (Punctuation.stringIsAllPunctuation(trimmedText, this.ctData.lang) && punctuationAllowed) {
      return {isValid: true, warnings: [], errors: []};
    }
    const parsedTokens = EditionWitnessTokenStringParser.parse(currentText, this.ctData.lang, true, true);
    if (parsedTokens.length === 1 && parsedTokens[0].tokenType === WitnessTokenType.WORD) {
      return {isValid: true, warnings: [], errors: []};
    }
    return {
      isValid: false,
      warnings: [],
      errors: [punctuationAllowed ? 'Please enter either a single word, punctuation or leave blank' : 'Please enter a single word or leave blank']
    };
  }

  getCellHoverInfo(row: number, col: number, element: HTMLElement): CtCellHoverInfo | null {
    const tokenIndex = this.ctData.collationMatrix[this.getWitnessIndexForRow(row) ?? -1]?.[col];
    const witnessIndex = this.getWitnessIndexForRow(row);
    const token = witnessIndex === undefined || tokenIndex === -1 || tokenIndex === undefined
      ? undefined
      : this.ctData.witnesses[witnessIndex]?.tokens[tokenIndex];
    if (token === undefined || (token.tokenClass === WitnessTokenClass.EDITION && token.tokenType === WitnessTokenType.FORMAT_MARK)) {
      return null;
    }
    return {
      row,
      col,
      witnessIndex: witnessIndex as number,
      tokenIndex,
      element,
      html: this.getPopoverHtml(witnessIndex as number, tokenIndex)
    };
  }

  getPopoverHtml(witnessIndex: number, tokenIndex: number): string {
    const cacheKey = this.getCacheKey('popover', witnessIndex, tokenIndex);
    const cachedHtml = this.tokenCache.get(cacheKey);
    if (cachedHtml !== undefined) {
      return cachedHtml;
    }
    const witness = this.ctData.witnesses[witnessIndex];
    const token = witness?.tokens[tokenIndex];
    if (witness === undefined || token === undefined) {
      return '';
    }
    const postNotes = token.tokenClass === WitnessTokenClass.FULL_TX ? this.getPostNotes(witnessIndex, tokenIndex) : [];
    const html = CollationTablePopovers.getPopoverHtml(witnessIndex, tokenIndex, witness, postNotes, this.peopleInfo);
    this.tokenCache.set(cacheKey, html);
    return html;
  }

  private recalculateVariants(): void {
    const rowDefinition = this.getRowDefinition();
    const matrix = new Matrix<number>(rowDefinition.length, rowDefinition[0]?.values.length ?? 0, -1);
    matrix.setFromArray(rowDefinition.map((row) => row.values));
    this.variantsMatrix = genVariantsMatrix(
      matrix,
      this.ctData.witnesses,
      CtData.getCtRowWitnessIndexes(this.ctData),
      this.ctData.type === 'edition' ? this.ctData.editionWitnessIndex : -1
    );
  }

  private getPostNotes(witnessIndex: number, tokenIndex: number): FullTxItemEditorialNote[] {
    const itemIndexes = this.aggregatedNonTokenItemIndexes[witnessIndex]?.[tokenIndex]?.post ?? [];
    const items = this.ctData.witnesses[witnessIndex].items ?? [];
    return itemIndexes.flatMap((itemIndex) => items[itemIndex]?.notes ?? []);
  }

  private getClassesFromItem(item: FullTxItemInterface): string[] {
    const classes: string[] = [];
    if (item.hand !== undefined && item.hand !== 0) {
      classes.push(`hand-${item.hand}`);
    }
    if (item.format !== undefined && item.format !== '') {
      classes.push(item.format);
    }
    if (item.clarity !== undefined && item.clarity !== 1) {
      classes.push('unclear');
    }
    if (item.textualFlow === 1) {
      classes.push('addition');
    }
    if (item.deletion !== undefined && item.deletion !== '') {
      classes.push('deletion');
    }
    if (item.normalizationType !== undefined && item.normalizationType !== '') {
      classes.push(item.normalizationType);
    }
    return classes;
  }

  private getCacheKey(field: string, witnessIndex: number, tokenIndex: number): string {
    return `${field}:${witnessIndex}:${tokenIndex}`;
  }
}