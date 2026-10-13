import {Button, ButtonGroup, Form} from "react-bootstrap";
import {Apparatus} from "@/Edition/Apparatus";

export type MainTextEditMode = 'off' | 'apparatus' | 'text';
export type ApparatusHighlightSelection = 'all' | 'none' | 'active' | number;

interface MainTextPanelToolbarProps {
  mode: MainTextEditMode;
  canEdit: boolean;
  apparatuses: Apparatus[];
  apparatusHighlightSelection: ApparatusHighlightSelection;
  showApparatusPopovers: boolean;
  onModeChange: (mode: MainTextEditMode) => void;
  onChangeApparatusHighlightSelection: (selection: ApparatusHighlightSelection) => void;
  onChangeApparatusPopovers: (show: boolean) => void;
}

export default function MainTextPanelToolbar({mode, canEdit, apparatuses, apparatusHighlightSelection,
                                               showApparatusPopovers, onModeChange, onChangeApparatusHighlightSelection,
                                               onChangeApparatusPopovers}: MainTextPanelToolbarProps) {
  const modes: Array<{mode: MainTextEditMode, label: string, disabled?: boolean}> = [
    {mode: 'off', label: 'Off'},
    {mode: 'apparatus', label: 'Apparatus', disabled: !canEdit},
    {mode: 'text', label: 'Text', disabled: !canEdit},
  ];

  return <div className="panel-toolbar main-text-panel-toolbar">
    <div className="main-text-mode-controls">
      <span>Mode: </span>
      <ButtonGroup size="sm" role="group" aria-label="Main text mode">
        {modes.map(({mode: option, label, disabled}) => <Button key={option} type="button"
                                                                 variant={mode === option ? 'secondary' : 'outline-secondary'}
                                                                 aria-pressed={mode === option}
                                                                 disabled={disabled}
                                                                 onClick={() => onModeChange(option)}>{label}</Button>)}
      </ButtonGroup>
    </div>
    <div className="main-text-view-controls">
      <Form.Group className="main-text-apparatus-highlight-control" controlId="main-text-apparatus-highlights">
        <Form.Label className="mb-0">Highlight apparatus</Form.Label>
        <Form.Select aria-label="Highlight apparatus" value={apparatusHighlightSelection}
                     className="w-auto"
                     onChange={(event) => {
                       const value = event.currentTarget.value;
                       if (value === 'all' || value === 'none' || value === 'active') {
                         onChangeApparatusHighlightSelection(value);
                       } else {
                         const index = Number.parseInt(value, 10);
                         if (Number.isInteger(index)) {
                           onChangeApparatusHighlightSelection(index);
                         }
                       }
                     }}>
          <option value="all">All</option>
          <option value="none">None</option>
          <option value="active">Active</option>
          {apparatuses.map((apparatus, index) => <option key={`${apparatus.type}-${index}`} value={index}>
            {apparatus.type}
          </option>)}
        </Form.Select>
      </Form.Group>
      <Form.Check type="switch" id="main-text-apparatus-popovers" label="Apparatus popovers"
                  checked={showApparatusPopovers}
                  onChange={(event) => onChangeApparatusPopovers(event.currentTarget.checked)}/>
    </div>
  </div>;
}