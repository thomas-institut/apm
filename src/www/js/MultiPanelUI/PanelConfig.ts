import {doNothing} from "../toolbox/FunctionUtil";
import {TabConfigInterface} from "./TabConfig";


export interface PanelConfigInterface {
    id: string,
    type: string,
    tabs: TabConfigInterface[],
    tabOrder: number[],
    content: (panelId: string, mode: string) => string,
    postRender: (panelId: string, mode: string) => void,
    onResize: (panelId: string, mode: string) => void,
    activeTabId: string
}

export const PanelConfigOptionsSpec = {
    id: {
        type: 'string',
        required: true
    },
    type: {
        //  'simple' | 'tabs'
        type: 'string',
        required: true
    },
    tabs: {
        // tab specification for a panel of type 'tabs'
        type: 'array',
        default: []
    },
    tabOrder: {
        // tab order as a list of indexes to the options.tabs array
        // if an empty array is given, the order will the same as the tabs.array
        type: 'array',
        default: []
    },
    content: {
        // function to call to get the content of a panel of type 'simple
        // (panelId, mode) =>  string
        type: 'function',
        default: () => { return ''}
    },
    postRender: {
        // Function to call after a panel  is rendered
        //  (panelId, mode) =>  void
        type: 'function',
        default: doNothing
    },
    onResize: {
        // Function to call after a panel is resized
        //  (panelId, mode) =>  void
        type: 'function',
        default: doNothing
    },
    activeTabId: {
        // id of the initially active tab
        // if not given or empty, the first tab will be the active one
        type: 'string',
        default: ''
    }
}