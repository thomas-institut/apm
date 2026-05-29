import {arrow, autoPlacement, autoUpdate, computePosition, offset} from "@floating-ui/dom";


const defaultArrowSize =  10;
const defaultOffset = 1;
const defaultHoverDelay = 250;

/**
 * Adds a popover to an element or an array of elements.
 * @param elements
 * @param options
 */
export function withPopover(elements: HTMLElement | (HTMLElement | null)[] | null, options: PopoverOptions): void {
  if (!Array.isArray(elements)) {
    elements = [elements];
  }
  elements.forEach((element) => {
    if (element !== null && element !== undefined) {
      new Popover(element, options);
    }
  });
}



interface PopoverOptions {
  /**
   * A string or a function that returns a string with the HTML content of the popover.
   * No sanitization of HTML is performed.
   */
  content: string | (() => Promise<string>),
  /**
   * The trigger event for the popover.  Default is 'hover'.
   */
  trigger?: 'hover' | 'click' | 'manual',
  /**
   * The position of the popover relative to the element. Default is 'auto'.
   */
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto',
  /**
   * The number of pixels from the edge of the popover to the tip of arrow.
   * Default is 10.  If 0, no arrow is shown.
   */
  arrowSize?: number,

  /**
   * The number of pixels to offset the popover from the element.
   * Default is 1.
   */
  offset?: number,

  /**
   * The delay in milliseconds before the popover is shown when the trigger
   * is 'hover'. The default is 1/4 of a second.
   * Set to 0 to show the popover immediately.
   */
  hoverDelay?: number,


  /**
   * A space-separated list of classes to add to the popover element.
   */
  popoverClass?: string,


  /**
   * The background color of the popover's arrow depending on the position.
   * If not given, the arrow inherits the background color of the popover.
   */
  arrowBackgroundColor?: string | { top?: string, right?: string, bottom?: string, left?: string},

}


/**
 * Adds a popover to an element.
 *
 * The popover can be triggered by hovering over the element, clicking on the element, or manually.
 *
 */
export class Popover {
  private readonly element: Element;
  private readonly content: string | (() => Promise<string>);
  private readonly trigger: "hover" | "click" | "manual";
  private readonly popoverClass: string;
  private readonly position: "top" | "bottom" | "left" | "right" | "auto";
  private readonly arrowSize: number;
  private readonly offset: number;
  private readonly arrowBgColor: string | { top?: string; right?: string; bottom?: string; left?: string } | undefined;
  private readonly hoverDelay: number;

  private popoverElement: HTMLElement | null;
  private arrowElement!: HTMLElement;
  private contentElement!: HTMLElement;
  private isVisible: boolean;
  private cleanup!: () => void;
  private isHovering: boolean;



  constructor(element: HTMLElement, options: PopoverOptions) {
    this.element = element;
    this.content = options.content;
    this.trigger = options.trigger ?? 'hover'
    this.popoverClass = options.popoverClass ?? '';
    this.popoverElement = null;
    this.position = options.position ?? 'auto';
    this.arrowSize = options.arrowSize ?? defaultArrowSize;
    this.arrowBgColor = options.arrowBackgroundColor;
    this.offset = options.offset ?? defaultOffset;
    this.hoverDelay = options.hoverDelay ?? defaultHoverDelay;

    this.isVisible = false;
    this.isHovering = false;

    switch (this.trigger) {
      case 'hover':
        this.element.addEventListener('mouseenter', (ev) => this.hover(ev));
        this.element.addEventListener('mouseleave', (ev) => this.hide(ev));
        this.element.addEventListener('blur', () => this.hide());
        break;

      case 'click':
        this.element.addEventListener('click', () => this.toggle());
        this.element.addEventListener('blur', () => this.hide());
        break;
    }
  }

  async toggle() {
    if (this.isVisible) {
      await this.hide();
    } else {
      await this.show();
    }
  }

  private getPopoverElement() {
    if (this.popoverElement === null) {
      const popEl =document.createElement('div');
      popEl.id = 'popover-' + Math.random().toString(36).substring(2, 15);
      if (this.popoverClass !== '') {
        popEl.classList.add(this.popoverClass);
      }
      popEl.style.display = 'none';
      popEl.style.position = 'absolute';
      popEl.style.zIndex = '1';
      popEl.style.width = 'max-content';
      popEl.style.left = '0';
      popEl.style.top = '0';
      this.popoverElement = popEl;

      const contEl = document.createElement('div');
      contEl.style.position = 'relative';
      contEl.style.zIndex = '3';
      popEl.appendChild(contEl);
      if (typeof this.content === 'string') {
        contEl.innerHTML = this.content;
      }
      this.contentElement = contEl;

      if (this.arrowSize > 0) {
        const arrowEl = document.createElement('div');
        const arrowElementSize = this.arrowSize * Math.sqrt(2) + 'px';
        arrowEl.style.width = arrowElementSize;
        arrowEl.style.height = arrowElementSize;
        arrowEl.style.zIndex = '2';
        arrowEl.style.position = 'absolute';
        arrowEl.style.backgroundColor = 'inherit';
        arrowEl.style.border = 'inherit';
        arrowEl.style.transform= 'rotate(45deg)';
        arrowEl.style.pointerEvents= 'none';
        popEl.appendChild(arrowEl);
        this.arrowElement = arrowEl;
      }
    }
    return this.popoverElement;
  }

  async hover(ev: Event | null = null) {
    if (this.hoverDelay === 0) {
      await this.show(ev);
      return;
    }
    this.isHovering = true;

    setTimeout(async () => {
      if (this.isHovering) {
        await this.show(ev);
      }
      this.isHovering = false;
    }, this.hoverDelay);
  }


  async show(ev: Event | null = null) {
    const content = typeof this.content === 'string' ? this.content : await this.content();
    if (content.trim() === '') {
      // do not show an empty popover
      return;
    }


    if (ev !== null) {
      ev.preventDefault();
    }
    const popoverElement = this.getPopoverElement();
    document.body.appendChild(popoverElement);
    if (typeof this.content === 'function') {
      this.contentElement.innerHTML = content;
    }
    popoverElement.style.display = 'block';
    this.isVisible = true;
    this.cleanup = autoUpdate(this.element, popoverElement, () => this.update());
  }

  async hide(ev: Event | null = null) {
    if (this.popoverElement !== null) {
      this.popoverElement.style.display = 'none';
      await this.update();
      this.popoverElement.remove();
      this.cleanup();
      this.popoverElement = null;
      if (ev !== null) {
        ev.preventDefault();
      }
    }
    this.isVisible = false;
    this.isHovering = false;
  }

  private async update() {
    if (this.popoverElement === null) {
      return;
    }
    let options: any = {middleware: [offset(this.arrowSize + this.offset)]};
    if (this.position === 'auto') {
      options.middleware.push(autoPlacement());
    } else {
      options.placement = this.position;
    }
    if (this.arrowSize > 0) {
      options.middleware.push(arrow({element: this.arrowElement}));
    }
    const pos = await computePosition(this.element, this.popoverElement, options);
    // console.log(`Popover position`, pos);
    Object.assign(this.popoverElement.style, {
      left: `${pos.x}px`, top: `${pos.y}px`,
    });
    // place the arrow
    const side = pos.placement.split('-')[0];

    const staticSide = {
      top: 'bottom', right: 'left', bottom: 'top', left: 'right',
    }[side] ?? '';

    if (pos.middlewareData.arrow) {
      const {x, y} = pos.middlewareData.arrow;
      const staticSideOffset = -this.arrowElement.offsetWidth / 2;

      Object.assign(this.arrowElement.style, {
        left: x !== null ? `${x}px` : '', top: y !== null ? `${y}px` : '', [staticSide]: `${staticSideOffset}px`,
      });
      this.styleArrow(side);
    }
  }

  private getArrowBgColor(side: string): string | null  {
    if (this.arrowBgColor === undefined) {
      return null;
    }
    if (typeof this.arrowBgColor === 'string'){
      return null;
    }
    // @ts-expect-error using the side as a key
    return this.arrowBgColor?.[side] ?? null;
  }

  private styleArrow(side: string){
    const a = this.arrowElement;
    if (typeof this.arrowBgColor === 'string') {
      a.style.backgroundColor = this.arrowBgColor;
    } else {
      const bgColor = this.getArrowBgColor(side);
      if (bgColor !== null) {
        a.style.backgroundColor = bgColor;
      }
    }
    switch (side) {
      case 'top':
        a.style.borderLeft = 'none';
        a.style.borderTop = 'none';
        break;

      case 'bottom':
        a.style.borderRight = 'none';
        a.style.borderBottom = 'none';
        break;

      case 'left':
        a.style.borderLeft = 'none';
        a.style.borderBottom = 'none';
        break;

      case 'right':
        a.style.borderRight = 'none';
        a.style.borderTop = 'none';
        break;
    }
  }


}