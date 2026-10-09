import {ArrowDown, ArrowUp} from 'react-bootstrap-icons';
import {SiglaGroupInterface} from '@/CtData/CtDataInterface';
import EditableTextField from '@/ReactAPM/Components/EditableTextField';
import NiceTable, {NiceTableColumnDef} from '@/ReactAPM/Components/NiceTable/NiceTable';
import NiceToggle from '@/ReactAPM/Components/NiceToggle/NiceToggle';
import SiglaGroupsPanel from '@/ReactAPM/Components/SiglaGroupsPanel/SiglaGroupsPanel';
import './WitnessesPanel.css';

export interface EditionWitnessData {
  witnessIndex: number;
  siglum: string;
  title: string;
  excludeFromAutoCriticalApparatus: boolean;
  includeInAutoMarginalFoliation: boolean;
}

type WitnessOrderDirection = 'up' | 'down';

interface WitnessesPanelProps {
  witnesses: EditionWitnessData[];
  sigla: string[];
  siglaGroups: SiglaGroupInterface[];
  disabled?: boolean;
  isSiglumValid: (witnessIndex: number, siglum: string) => true | string;
  isSiglaGroupValid: (siglaGroupIndex: number, group: SiglaGroupInterface) => true | string;
  onMoveWitness: (witnessIndex: number, direction: WitnessOrderDirection) => boolean | Promise<boolean>;
  onChangeSiglum: (witnessIndex: number, newSiglum: string) => boolean | Promise<boolean>;
  onChangeExcludeFromAutoCriticalApparatus: (witnessIndex: number, newStatus: boolean) => boolean | Promise<boolean>;
  onChangeIncludeInAutoMarginalFoliation: (witnessIndex: number, newStatus: boolean) => boolean | Promise<boolean>;
  onDeleteSiglaGroup: (siglaGroupIndex: number) => boolean | Promise<boolean>;
  onChangeSiglaGroup: (siglaGroupIndex: number, newGroup: SiglaGroupInterface) => boolean | Promise<boolean>;
}

export default function WitnessesPanel({
                                         witnesses,
                                         sigla,
                                         siglaGroups,
                                         disabled = false,
                                         isSiglumValid,
                                         isSiglaGroupValid,
                                         onMoveWitness,
                                         onChangeSiglum,
                                         onChangeExcludeFromAutoCriticalApparatus,
                                         onChangeIncludeInAutoMarginalFoliation,
                                         onDeleteSiglaGroup,
                                         onChangeSiglaGroup
                                       }: WitnessesPanelProps) {
  const witnessColumnDefs: NiceTableColumnDef<EditionWitnessData>[] = [
    {
      key: 'n',
      title: '#',
      width: '2em',
      cellContent: (_witness, rowIndex) => <>{rowIndex + 1}</>
    },
    {
      key: 'witness',
      title: 'Witness',
      cellContent: witness => <>{witness.title}</>
    },
    {
      key: 'order',
      title: 'Order',
      width: '4em',
      cellContent: (witness, rowIndex) => <div className="witness-order-controls">
        <button type="button" aria-label={`Move ${witness.title} up`} title={`Move ${witness.title} up`}
                disabled={disabled || rowIndex === 0} onClick={() => onMoveWitness(witness.witnessIndex, 'up')}>
          <ArrowUp/>
        </button>
        <button type="button" aria-label={`Move ${witness.title} down`} title={`Move ${witness.title} down`}
                disabled={disabled || rowIndex === witnesses.length - 1}
                onClick={() => onMoveWitness(witness.witnessIndex, 'down')}>
          <ArrowDown/>
        </button>
      </div>
    },
    {
      key: 'siglum',
      title: 'Siglum',
      width: '5em',
      tdClassName: 'siglum',
      cellContent: witness => <EditableTextField
        text={witness.siglum}
        disabled={disabled}
        validator={newSiglum => isSiglumValid(witness.witnessIndex, newSiglum)}
        onConfirm={newSiglum => onChangeSiglum(witness.witnessIndex, newSiglum)}
      />
    },
    {
      key: 'criticalApparatus',
      title: 'Auto Crit. App.',
      cellContent: witness => <NiceToggle
        isOn={witness.excludeFromAutoCriticalApparatus}
        onTitle={`Click to include ${witness.title} in the automatic critical apparatus`}
        offTitle={`Click to exclude ${witness.title} from the automatic critical apparatus`}
        onClick={disabled ? undefined : newStatus => onChangeExcludeFromAutoCriticalApparatus(witness.witnessIndex, newStatus)}
      />
    },
    {
      key: 'marginalFoliation',
      title: 'Marg. Fol.',
      cellContent: witness => <NiceToggle
        isOn={witness.includeInAutoMarginalFoliation}
        onTitle={`Click to exclude ${witness.title} from auto marginal foliation`}
        offTitle={`Click to include ${witness.title} in auto marginal foliation`}
        onClick={disabled ? undefined : newStatus => onChangeIncludeInAutoMarginalFoliation(witness.witnessIndex, newStatus)}
      />
    }
  ];

  return <div className="edition-witnesses-panel">
    <div className="section witnesses">
      <h1>Witnesses</h1>
      <div className="section-content">
        {witnesses.length === 0 && <>No witnesses defined</>}
        {witnesses.length > 0 && <NiceTable columnDefs={witnessColumnDefs} rows={witnesses}/>}
      </div>
    </div>
    <SiglaGroupsPanel
      sigla={sigla}
      siglaGroups={siglaGroups}
      isSiglaGroupValid={isSiglaGroupValid}
      onDeleteSiglaGroup={onDeleteSiglaGroup}
      onChangeSiglaGroup={onChangeSiglaGroup}
      disabled={disabled}
    />
  </div>;
}