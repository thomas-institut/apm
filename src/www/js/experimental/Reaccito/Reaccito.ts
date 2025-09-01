import {h, VNode} from "snabbdom";

export type Props = { [key: string]: any };

export type Component = (props: Props, child: VNode | null) => Promise<Element>;


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
  props?: Props;
  component?: Component;
  vnode?: VNode;
  children: Element[] = [];
}


export function createElement(tagOrComponentOrVNode: string|Component|VNode|Element, props?: any, children?: (Element | Component | VNode | string)[]): Element {

  if (tagOrComponentOrVNode instanceof Element) {
    return tagOrComponentOrVNode;
  }
  if (typeof tagOrComponentOrVNode === 'function') {
    // a component
    const element = new Element();
    element.type = 'component';
    element.component = tagOrComponentOrVNode as Component;
    if (children === undefined) {
      element.children = [];
    } else if (children.length === 1) {
      element.children = [ createElement(children[0])];
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
  }





}


export class Reaccito {
  private rootElement: Element;
  private domElement: HTMLElement;

  constructor(mainComponent: Component, props: Props, domElement: HTMLElement) {
    this.rootElement = {
      type: 'component', tag: '', props: props, component: mainComponent, children: [],
    };
    this.domElement = domElement;
  }

  public async render(): Promise<void> {

  }

  private async getVNode(e: Element | Promise<Element> | VNode | string | null): Promise<VNode | null> {
    if (e === null) {
      return null;
    }
    if (typeof e === 'string') {
      return h('span', null, e);
    }
    if (e instanceof Promise) {
      e = await e;
    }
    if (e instanceof Element) {
      switch (e.type) {
        case 'component':
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
        case 'vnode':
          return e.vnode || null;

        case 'string':
          return h('span', null, e.tag);
      }
    } else {
      return e;
    }
    return null;
  }

}