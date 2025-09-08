import {classModule, eventListenersModule, h, init, propsModule, styleModule, VNode} from "snabbdom";


export type Component = (props?: any, child?: VNode | null) => Promise<Element>;


type ElementType = 'rawVnode' | 'vnode' | 'component' | 'string';


class Element {
  /**
   * The element's type:
   *  - 'rawVnode': a snabbdom VNode already created with h()
   *  - 'vnode': instructions to create a Vnode with snabbdom's h()
   *  - 'component': a component, i.e., a function that returns a Promise that resolves to an Element
   *  - 'string': a string
   */
  type: ElementType = 'vnode';
  tag: string = '';
  props?: any;
  component?: Component;
  vnode?: VNode;
  children: Element[] = [];
  state?: any;
}


export function createElement(tagOrComponentOrVNode: string | Component | VNode | Element, props?: any, children?: (Element | Component | VNode | string)[]): Element {

  const debug = false;

  debug && console.log("createElement", tagOrComponentOrVNode, props, children);
  if (tagOrComponentOrVNode instanceof Element) {
    return tagOrComponentOrVNode;
  }
  if (typeof tagOrComponentOrVNode === 'function') {
    // a component
    const element = new Element();
    element.type = 'component';
    element.component = tagOrComponentOrVNode as Component;
    element.props = props;
    if (children === undefined || children.length === 0) {
      element.children = [];
    } else if (children.length === 1) {
      element.children = [createElement(children[0])];
    } else {
      throw new Error('Components can only have one child');
    }
    return element;
  }
  if (typeof tagOrComponentOrVNode === 'string') {
    // a string
    if (props === undefined && children === undefined) {
      const element = new Element();
      element.type = 'string';
      element.tag = tagOrComponentOrVNode;
      return element;
    }
    const element = new Element();
    element.type = 'vnode';
    element.tag = tagOrComponentOrVNode;
    if (props !== undefined) {
      element.props = props;
    }
    if (children !== undefined) {
      element.children = children.map(child => createElement(child));
    }
    return element;
  }

  // a raw VNode
  const element = new Element();
  element.type = 'rawVnode';
  element.vnode = tagOrComponentOrVNode;
  return element;
}


const reaccitoInstances: Reaccito[] = [];


export async function mount(mainComponent: Component, props: any, domElement: HTMLElement): Promise<void> {
  const reaccito = new Reaccito(mainComponent, props, domElement);
  reaccitoInstances.push(reaccito);
  await reaccito.render();
}

export class Reaccito {
  private readonly rootElement: Element;
  private readonly domElement: HTMLElement;
  private readonly patch: (oldVnode: any, vnode: VNode) => VNode;
  private currentVNode: VNode | null;

  constructor(mainComponent: Component, props: any, domElement: HTMLElement) {
    this.rootElement = createElement(mainComponent, props, []);
    this.domElement = domElement;
    this.patch = init([
      // Init patch function with chosen modules
      classModule, // makes it easy to toggle classes
      propsModule, // for setting properties on DOM elements
      styleModule, // handles styling on elements with support for animations
      eventListenersModule // attaches event listeners
    ]);
    this.currentVNode = null;
  }

  public async render(): Promise<void> {
   if (this.currentVNode === null) {
     this.currentVNode = await this.getVNode(this.rootElement);
     if (this.currentVNode === null) {
       console.warn('No VNode returned from main component');
     } else {
       this.patch(this.domElement, this.currentVNode);
     }
   } else {
     const newVNode = await this.getVNode(this.rootElement);
     if (newVNode === null) {
       console.warn('No VNode returned from main component');
     } else {
       this.patch(this.currentVNode, newVNode);
     }
   }
  }

  private async getVNode(e: Element | Promise<Element> | VNode | string | null): Promise<VNode | null> {
    const debug = false;
    debug && console.log("getVNode", e);
    if (e === null) {
      debug && console.log('Null element');
      return null;
    }
    if (typeof e === 'string') {
      debug && console.log('String element');
      return h('span', null, e);
    }
    if (e instanceof Promise) {
      debug && console.log('Promise element');
      e = await e;
    }
    if (e instanceof Element) {
      debug && console.log('Element', e);
      switch (e.type) {
        case 'component':
          debug && console.log('Component', e);
          if (e.component === undefined) {
            throw new Error('Component is undefined');
          }
          if (e.children.length > 1) {
            throw new Error('Components can only have one child');
          }
          if (e.children.length === 0) {
            return this.getVNode(e.component(e.props ?? {}, null));
          } else {
            const childVNode = await this.getVNode(e.children[0]);
            return this.getVNode(e.component(e.props ?? {}, childVNode));
          }
        case 'rawVnode':
          debug && console.log('Raw VNode', e);
          return e.vnode || null;

        case 'vnode':
          debug && console.log('VNode', e);
          return h(e.tag, e.props ?? null, await Promise.all(e.children.map(child => this.getVNode(child))));

        case 'string':
          debug && console.log('String', e);
          return h('span', null, e.tag);
      }
    } else {
      debug && console.log('VNode', e);
      return e;
    }
  }

}