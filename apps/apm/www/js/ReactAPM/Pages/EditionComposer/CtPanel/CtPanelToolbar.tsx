import {Button, Dropdown} from 'react-bootstrap';
import {CollationTableSearchMatch} from '@/EditionComposer/CollationTableSearch';
import CollationTableSearchControls from '@/EditionComposer/CollationTableSearchControls';
import {ToolbarCharacter} from '@/EditionComposer/ToolbarCharactersDefinition';
import {CustomApparatusInterface} from '@/CtData/CtDataInterface';
import {EraserFill} from "react-bootstrap-icons";

export type CtPanelMode = 'search' | 'move' | 'group';

export interface CtPanelToolbarProps {
  mode: CtPanelMode;
  canEdit: boolean;
  searchQuery: string;
  searchMatches: CollationTableSearchMatch[];
  selectedSearchMatch: number;
  textDirection: string;
  lang: string;
  showPopovers: boolean;
  showNormalizations: boolean;
  normalizationsAvailable: boolean;
  toolbarCharacters: ToolbarCharacter[];
  csvContent: string;
  deletableColumnCount: number;
  apparatuses: CustomApparatusInterface[];
  hasColumnSelection: boolean;
  showAddApparatusEntry: boolean;
  onModeChange: (mode: CtPanelMode) => void;
  onSearchQueryChange: (query: string) => void;
  onNavigateSearch: (direction: -1 | 1) => void;
  onTogglePopovers: (show: boolean) => void;
  onToggleNormalizations: (show: boolean) => void;
  onOpenNormalizationSettings: () => void;
  onCompact: () => void;
  onAddApparatusEntry: (apparatusIndex: number) => void;
}

export default function CtPanelToolbar(props: CtPanelToolbarProps) {
  return <div className="ct-panel-toolbar panel-toolbar">
    <div className="panel-toolbar-group ct-mode-toggle" role="group" aria-label="Collation table mode">
      <Button type="button" variant={props.mode === 'search' ? 'primary' : 'outline-secondary'} size="sm"
              aria-pressed={props.mode === 'search'} onClick={() => props.onModeChange('search')}>Search</Button>
      <Button type="button" variant={props.mode === 'move' ? 'primary' : 'outline-secondary'} size="sm"
              aria-pressed={props.mode === 'move'} disabled={!props.canEdit}
              onClick={() => props.onModeChange('move')}>Move</Button>
      <Button type="button" variant={props.mode === 'group' ? 'primary' : 'outline-secondary'} size="sm"
              aria-pressed={props.mode === 'group'} disabled={!props.canEdit}
              onClick={() => props.onModeChange('group')}>Group</Button>
    </div>

    <CollationTableSearchControls visible={props.mode === 'search'} query={props.searchQuery}
                                  matchCount={props.searchMatches.length}
                                  selectedMatch={props.selectedSearchMatch}
                                  textDirection={props.textDirection}
                                  onQueryChange={props.onSearchQueryChange}
                                  onNavigate={props.onNavigateSearch}/>

    <label className="panel-toolbar-item ct-toolbar-toggle">
      <input type="checkbox" checked={props.showPopovers}
             onChange={(event) => props.onTogglePopovers(event.target.checked)}/>
      <span>Popovers</span>
    </label>

    {props.normalizationsAvailable && <div className="panel-toolbar-group ct-normalization-controls">
      <label className="panel-toolbar-item ct-toolbar-toggle">
        <input type="checkbox" checked={props.showNormalizations}
               disabled={!props.canEdit}
               onChange={(event) => props.onToggleNormalizations(event.target.checked)}/>
        <span>Normalizations</span>
      </label>
      {props.showNormalizations && <Button type="button" variant="outline-secondary" size="sm"
                                           disabled={!props.canEdit}
                                           title="Choose automatic normalizations"
                                           aria-label="Normalization settings"
                                           onClick={props.onOpenNormalizationSettings}>
        <i className="fas fa-pen"/>
      </Button>}
    </div>}

    {props.showAddApparatusEntry && <Dropdown className="panel-toolbar-item ct-add-entry-dropdown">
      <Dropdown.Toggle size="sm" variant="outline-secondary" disabled={!props.hasColumnSelection}
                       title="Add apparatus entry" aria-label="Add apparatus entry">
        <i className="fas fa-plus"/> Apparatus entry
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {props.apparatuses.map((apparatus, index) => <Dropdown.Item as="button" key={`${apparatus.type}-${index}`}
                                                                      onClick={() => props.onAddApparatusEntry(index)}>
          {apparatus.type}
        </Dropdown.Item>)}
      </Dropdown.Menu>
    </Dropdown>}

    <Button type="button" variant="outline-secondary" size="sm" title="Delete all empty columns" className={'tb-button'}

            aria-label="Compact table" disabled={!props.canEdit || props.deletableColumnCount === 0}
            onClick={props.onCompact}>
      <EraserFill/>
    </Button>

    <div className="panel-toolbar-group ct-toolbar-characters">
      {props.toolbarCharacters.map((character, index) => <Button type="button" variant="outline-secondary" size="sm"
                                                                   className={`text-button text-${props.lang} tb-ch-button-${index} tb-button`}
                                                                   key={`${character.title}-${index}`}
                                                                   title={`${character.title} (click to copy)`}
                                                                   onClick={() => navigator.clipboard.writeText(character.character)}>
        {character.character}
      </Button>)}
    </div>

    <a className="tb-button ct-export-csv" download="ApmCollationTable.csv"
       href={`data:text/csv;charset=utf-8,${encodeURIComponent(props.csvContent)}`} title="Download CSV">
      <small>CSV</small><i className="fas fa-download"/>
    </a>
  </div>;
}