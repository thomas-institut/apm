import {VNode, h} from "snabbdom";

export type Props = { [key: string]: any };

export type Component = (props: Props, child: VNode|null) => Element | Promise<Element>;


type ElementType = 'node' | 'component' | 'string';


class Element {
  type: ElementType = 'node';
  tag: string = '';
  props?: Props;
  component?: Component;
  children: (Element|VNode|string)[] = [];
}


export function createElement(tag: string, props: any, children: (Element|VNode|string)[] = []): Element|VNode|string {
  let childrenAreVNodesOrStrings = true;
  for (let i = 0; i < children.length; i++) {
    if (children[i] instanceof Element) {
      childrenAreVNodesOrStrings = false;
      break;
    }
  }
  if (childrenAreVNodesOrStrings) {
    // @ts-expect-error All children are either VNodes or strings, so this should work fine
    return h(tag, props, children);
  }
  const theElement = new Element();
  theElement.tag = tag;
  theElement.props = props;
  theElement.children = children;

  return theElement;
}


export class Reaccito {
  private rootElement: Element;
  private domElement: HTMLElement;

  constructor(mainComponent: Component, props: Props, domElement: HTMLElement) {
    this.rootElement = {
      type: 'component',
      tag: '',
      props: props,
      component: mainComponent,
      children: [],
    }
    this.domElement = domElement;
  }

  private async getVNode(e: Element|Promise<Element>|VNode|string|null): Promise<VNode|null> {
    if (e === null) {
      return null;
    }
    if (typeof e === 'string') {
      return h('span', null, e);
    }
    if (e instanceof Promise || e instanceof Element) {
      e = await e;
      switch (e.type) {
        case 'component':
          if (e.component === undefined) {
            throw new Error('Component is undefined');
          }
          if (e.children.length > 1) {
            throw new Error('Component can only have one child');
          }
          if (e.children.length === 0) {
            return this.getVNode(e.component(e.props ?? {}, null));
          } else {
            const childVNode = await this.getVNode(e.children[0]);
            return this.getVNode(e.component(e.props ?? {}, childVNode));
          }
        case 'node':
          return h(e.tag, e.props ?? null);
      }
    } else {
      return e;
    }
    return null;
  }

  public async render(): Promise<void> {

  }

}