import './split-grid.css';

import {LoremIpsum} from "lorem-ipsum";

genPage().then(html => {
  document.body.innerHTML = html;


  const divider = document.querySelector('#theContainer .divider');
  const container = document.getElementById('theContainer');

  if (divider !== null && container !== null) {
    new SplitGrid({
      container: container as HTMLElement,
      divider: divider as HTMLElement,
      initGrid: true,
      dividerSize: 3,
      direction: 'vertical'
    });
  }

  const divider2 = document.querySelector('#secondContainer .divider');
  const container2 = document.getElementById('secondContainer');


  if (divider2 !== null && container2 !== null) {
    new SplitGrid({
      container: container2 as HTMLElement,
      divider: divider2 as HTMLElement,
      initGrid: true,
      dividerSize: 1,
      direction: 'horizontal'
    });
  }
});



interface SplitGridOptions {
  container: HTMLElement;
  divider: HTMLElement;
  direction?: 'horizontal' | 'vertical';
  initGrid?: boolean;
  dividerSize?: number;
}

const Granularity = 2;

class SplitGrid {
  private container: HTMLElement;
  private divider: HTMLElement;
  private resizing: boolean;
  private lastXY: number;
  private readonly dividerWidth: number;
  private resizeCount: number;
  private readonly direction: 'horizontal' | 'vertical';

  constructor(options: SplitGridOptions) {
    this.container = options.container;
    this.divider = options.divider;
    this.direction = options.direction ?? 'vertical';
    this.dividerWidth = options.dividerSize ?? this.divider.getBoundingClientRect().width;

    if (options.initGrid) {
      this.container.style.display = 'grid';
      this.setCurrentGridTemplate(`0.5fr ${this.dividerWidth}px 0.5fr`);
      this.divider.style.cursor = this.direction === 'vertical' ? 'col-resize' : 'row-resize';
      this.divider.style.width = '100%';
    }

    if (this.getCurrentGridTemplate() === '') {
      this.setCurrentGridTemplate(`0.5fr ${this.dividerWidth}px 0.5fr`);
    }

    this.resizing = false;
    this.lastXY = -1;
    this.resizeCount = 0;

    this.divider.addEventListener('mousedown', this.startResizing.bind(this));
    this.divider.addEventListener('mouseup', this.stopResizing.bind(this));
    this.divider.addEventListener('dblclick', () => {
      if (!this.resizing) {
        this.setCurrentGridTemplate(`0.5fr ${this.dividerWidth}px 0.5fr`);
      }
    });

    this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.addEventListener('mouseup', this.stopResizing.bind(this));
    this.container.addEventListener('mouseleave', this.stopResizing.bind(this));
  }

  private startResizing() {
    this.resizing = true;
    this.container.style.userSelect = 'none';
  }

  private stopResizing() {
    this.resizing = false;
    this.container.style.userSelect = '';
  }

  private onMouseMove(e: MouseEvent) {
    if (this.resizing) {
      // e.preventDefault();
      // e.stopPropagation();
      const newXY = this.direction === 'vertical' ? e.clientX : e.clientY;
      if (Math.abs(newXY - this.lastXY) < Granularity) {
        return;
      }
      const containerRect = this.container.getBoundingClientRect();
      const containerLength = this.direction === 'vertical' ? containerRect.width : containerRect.height;
      const containerStart = this.direction === 'vertical' ? containerRect.left : containerRect.top;
      const firstRatio = (newXY - containerStart) / containerLength;
      const secondRatio = 1 - firstRatio;
      this.setCurrentGridTemplate(`${firstRatio}fr ${this.dividerWidth}px ${secondRatio}fr`);
      this.lastXY = newXY;
      this.resizeCount++;
      // console.log(`Resize count: ${this.resizeCount}`);
    }
  }

  private getCurrentGridTemplate() {
    return this.direction === 'vertical' ? this.container.style.gridTemplateColumns : this.container.style.gridTemplateRows;
  }

  private setCurrentGridTemplate(template: string) {
    if (this.direction === 'vertical') {
      this.container.style.gridTemplateColumns = template;
    } else {
      this.container.style.gridTemplateRows = template;
    }
  }

}


async function genPage(): Promise<string> {
  const lorem = new LoremIpsum();
  lorem.format = 'html';

  const toolBox = await import('../../js/toolbox/ToolBox.js');

  console.log("Toolbox imported", toolBox);

  const myT = new toolBox.MyClass('a test');

  console.log("MyT", myT.getT());

  return `
  <div class="pageHeaderDiv">This is a page header</div>
  <div class="panelsContainer" id="theContainer">
    <div class="panel left-panel">
        <h1>Left Panel</h1>
        <p>This is the left panel</p>
        ${lorem.generateParagraphs(3)}
    </div>
    <div class="divider"></div>
       <div class="panel panelWithToolbar right-panel">
        <div class="panelToolbar">
            Right Panel
        </div>
        <div class="panelWithToolbarContent" id="secondContainer">
        <div class="panel insidePanel"> ${lorem.generateParagraphs(2)}</div>
        <div class="divider shaded"></div>
        <div class="panel insidePanel"> ${lorem.generateParagraphs(20)}</div>
         
        </div>
        </div>
  </div>
  `;
}
