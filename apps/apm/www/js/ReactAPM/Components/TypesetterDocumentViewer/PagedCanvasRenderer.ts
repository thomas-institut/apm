import {TextBox, TypesetterDocument, TypesetterPage, TypesetterRenderer} from "@thomas-inst/typesetter";

export class PagedCanvasRenderer extends TypesetterRenderer {
  private canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private scale: number;
  private pageMargin: number;
  private currentPage: number;

  constructor(canvasElement: HTMLCanvasElement) {
    super();
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.scale = 1;
    this.pageMargin = 0;
    this.currentPage = 0;
  }

  setScale(scale: number) {
    this.scale = scale;
    return this;
  }

  setPageMargin(pageMargin: number) {
    this.pageMargin = Math.round(pageMargin);
    return this;
  }

  setCurrentPage(page: number) {
    this.currentPage = page;
    return this;
  }

  renderDocument(doc: TypesetterDocument) {
    if (this.ctx === null) {
      return;
    }
    this._preRenderDocument(doc);
    const thePage = doc.getPage(this.currentPage)
    this._preRenderPage(thePage, this.currentPage);
    this.renderPage(thePage, this.currentPage);
    this._postRenderDocument(doc);
  }

  /**
   *
   * @param {TypesetterDocument}doc
   */
  getCanvasDimensionsForDoc(doc: TypesetterDocument): [number, number] {
    const thePage = doc.getPage(this.currentPage);
    if (thePage) {
      const [pageWidth, pageHeight] = this.getDeviceCoordinates(thePage.getWidth(), thePage.getHeight());
      return [ Math.round(pageWidth + 2 * this.pageMargin), Math.round(pageHeight + 2 * this.pageMargin)];
    } else {
      return [this.pageMargin, this.pageMargin];
    }
  }

  renderTextBox(textBoxItem: TextBox, x: number, y: number) {
    if (this.ctx === null) {
      return;
    }
    let text = textBoxItem.getText();
    // hack to work around Firefox's bug with single RTL brackets
    const brackets = ['[', ']', '(', ')', '{', '}', '«', '»', '<', '>'];
    if (brackets.indexOf(text) !== -1 && textBoxItem.getTextDirection() === 'rtl') {
      // insert an RTL marker before the text to force correct display
      text = String.fromCodePoint(0x202B) + text;
    }
    const [shiftX, shiftY] = this.getDeviceCoordinates(textBoxItem.getShiftX(), textBoxItem.getShiftY());
    const [, textBoxHeight] = this.getDeviceCoordinates(0, textBoxItem.getHeight());
    const [, fontSize] = this.getDeviceCoordinates(0, textBoxItem.getFontSize());
    const fontWeight = textBoxItem.getFontWeight() === '' ? 'normal' : textBoxItem.getFontWeight();
    const fontStyle = textBoxItem.getFontStyle() === '' ? 'normal' : textBoxItem.getFontStyle();
    const fontVariant = 'normal';
    const currentCanvasDirection = this.ctx.direction;
    if (textBoxItem.getTextDirection() !== '') {
      this.ctx.direction = textBoxItem.getTextDirection() as CanvasDirection;
      // debug && console.log(`Setting canvas direction to ${this.ctx.direction}, default is ${currentCanvasDirection}`)
      // debug && console.log(textBoxItem)
    }

    this.ctx.font = `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize}px ${textBoxItem.getFontFamily()} `;
    this.ctx.fillStyle = '#000000';
    this.ctx.fillText(text, x + shiftX, y + shiftY + textBoxHeight);
    this.ctx.direction = currentCanvasDirection;
  }

  getDeviceCoordinates(x: number, y: number): [number, number] {
    return [x * this.scale, y * this.scale];
  }

  _preRenderDocument(doc: TypesetterDocument) {
   // nothing to do here
  }

  _preRenderPage(page: TypesetterPage, pageIndex: number) {
    if (this.ctx === null) {
      return;
    }
    const [pageWidth, pageHeight] = this.getDeviceCoordinates(page.getWidth(), page.getHeight());
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillRect(this.pageMargin, this.pageMargin, pageWidth, pageHeight);
  }

  getShiftForPageIndex(pageIndex: number): [number, number] {
    return [this.pageMargin, this.pageMargin];
  }

}