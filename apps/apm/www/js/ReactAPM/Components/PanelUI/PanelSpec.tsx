import {cloneElement, JSX} from "react";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";

export interface PanelSpec {
  panel: 'one' | 'two';
  key: string;
  title: string;
  className?: string;
  expandable?: boolean;
  closable?: boolean;
  content: JSX.Element;
  tabbable?: boolean;
}


/**
 * Returns an array of panel elements from a panelSpecs array
 * @param panelSpecs
 * @param panel
 */
export function panelsFromSpecs(panelSpecs: PanelSpec[], panel: 'one' | 'two') {
  return panelSpecs.filter(panelSpec => panelSpec.panel === panel)
    .map((panelSpec) => {
      if (panelSpec.tabbable) {
        return cloneElement(panelSpec.content, {
          tabKey: panelSpec.key,
          tabTitle: panelSpec.title,
          className: panelSpec.className ?? '',
          closable: panelSpec.closable ?? false,
          expandable: panelSpec.expandable ?? false,
        });
      } else {
        return <Panel tabKey={panelSpec.key}
        className={panelSpec.className ?? ''}
        tabTitle={panelSpec.title}
        closable={panelSpec.closable ?? false}
        expandable={panelSpec.expandable ?? false}>
          {panelSpec.content}
          </Panel>;
      }
    });
}