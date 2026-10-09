import {useState} from 'react';
import {Button} from 'react-bootstrap';
import {Pencil, Trash} from 'react-bootstrap-icons';
import {SiglaGroupInterface} from '@/CtData/CtDataInterface';
import {SiglaGroupUtil} from '@/CtData/SiglaGroupUtil';
import ConfirmDialog from '@/ReactAPM/Components/ConfirmDialog';
import NiceTable, {NiceTableColumnDef} from '@/ReactAPM/Components/NiceTable/NiceTable';
import EditSiglaGroup from '@/ReactAPM/Components/SiglaGroupsPanel/EditSiglaGroup';
import './SiglaGroupsPanel.css';

interface SiglaGroupsPanelProps {
  sigla: string[];
  siglaGroups: SiglaGroupInterface[];
  isSiglaGroupValid: (siglaGroupIndex: number, group: SiglaGroupInterface) => true | string;
  onDeleteSiglaGroup?: (siglaGroupIndex: number) => boolean | Promise<boolean>;
  onChangeSiglaGroup?: (siglaGroupIndex: number, newGroup: SiglaGroupInterface) => boolean | Promise<boolean>;
  disabled?: boolean;
}

interface SiglaGroupsTableRow {
  siglum: string;
  sigla: string[];
}

export default function SiglaGroupsPanel({
                                           sigla,
                                           siglaGroups,
                                           isSiglaGroupValid,
                                           onDeleteSiglaGroup,
                                           onChangeSiglaGroup,
                                           disabled = false
                                         }: SiglaGroupsPanelProps) {
  const [editingSiglaGroupData, setEditingSiglaGroupData] = useState<null | {
    siglaGroupIndex: number;
    siglaGroup: SiglaGroupInterface;
  }>(null);
  const [confirmDeleteSiglaGroupIndex, setConfirmDeleteSiglaGroupIndex] = useState<number | null>(null);

  const siglaGroupsTableRows: SiglaGroupsTableRow[] = siglaGroups.map(siglaGroup => ({
    siglum: siglaGroup.siglum,
    sigla: siglaGroup.witnesses.map(witnessIndex => sigla[witnessIndex] ?? '')
  }));

  const siglaGroupsTableColumnDefs: NiceTableColumnDef<SiglaGroupsTableRow>[] = [
    {
      key: 'n',
      title: 'N',
      width: '2em',
      cellContent: (_siglumData, rowIndex) => <>{rowIndex + 1}</>,
    },
    {
      key: 'siglum',
      title: 'Group Siglum',
      cellContent: siglumData => <>{siglumData.siglum}</>
    },
    {
      key: 'sigla',
      title: 'Sigla',
      cellContent: siglumData => <>{siglumData.sigla.join(' ')}</>
    },
    {
      key: 'controls',
      title: '',
      cellContent: (siglumData, rowIndex) => <div className="controls">
        <Pencil className={'icon-btn'} title={`Click to edit sigla group ${siglumData.siglum}`} onClick={() => {
          if (!disabled) {
            setEditingSiglaGroupData({
              siglaGroupIndex: rowIndex,
              siglaGroup: siglaGroups[rowIndex]
            });
          }
        }}/>
        <Trash className={'icon-btn'} title={`Click to delete sigla group ${siglumData.siglum}`} onClick={() => {
          if (!disabled) {
            setConfirmDeleteSiglaGroupIndex(rowIndex);
          }
        }}/>
      </div>
    }
  ];

  const handleAcceptDeleteSiglaGroup = async () => {
    if (disabled || confirmDeleteSiglaGroupIndex === null || onDeleteSiglaGroup === undefined) {
      return;
    }
    await onDeleteSiglaGroup(confirmDeleteSiglaGroupIndex);
    setConfirmDeleteSiglaGroupIndex(null);
  };

  const siglaGroupToDelete = confirmDeleteSiglaGroupIndex === null ? null : siglaGroups[confirmDeleteSiglaGroupIndex] ?? null;
  const siglaGroupToDeleteLabel = siglaGroupToDelete === null ? '' : SiglaGroupUtil.getSiglaGroupString(siglaGroupToDelete, sigla);

  return <>
    <div className={'section sigla-groups'}>
      <h1>Sigla Groups</h1>
      <div className={'section-content'}>
        {siglaGroupsTableRows.length === 0 && <div>No sigla groups defined</div>}
        {siglaGroupsTableRows.length > 0 &&
          <NiceTable columnDefs={siglaGroupsTableColumnDefs} rows={siglaGroupsTableRows}/>}
        <Button variant={'outline-secondary'} size={'sm'} className={'add-sigla-group'} disabled={disabled} onClick={() => {
          setEditingSiglaGroupData({
            siglaGroupIndex: -1,
            siglaGroup: {
              siglum: '',
              witnesses: []
            }
          });
        }}>Add Sigla Group</Button>
      </div>
    </div>
    {editingSiglaGroupData !== null && <EditSiglaGroup
      sigla={sigla}
      siglaGroup={editingSiglaGroupData.siglaGroup}
      siglaGroupIndex={editingSiglaGroupData.siglaGroupIndex}
      isSiglaGroupValid={isSiglaGroupValid}
      onClickConfirm={async (siglaGroupIndex, group) => {
        if (onChangeSiglaGroup === undefined) {
          setEditingSiglaGroupData(null);
          return;
        }
        const result = await onChangeSiglaGroup(siglaGroupIndex, group);
        if (result) {
          setEditingSiglaGroupData(null);
        }
      }}
      onClickCancel={() => setEditingSiglaGroupData(null)}
    />}
    <ConfirmDialog
      show={confirmDeleteSiglaGroupIndex !== null}
      onHide={() => setConfirmDeleteSiglaGroupIndex(null)}
      onCancel={() => setConfirmDeleteSiglaGroupIndex(null)}
      onAccept={handleAcceptDeleteSiglaGroup}
      body={`Are you sure you want to remove sigla group ${siglaGroupToDeleteLabel} from the edition?`}
    />
  </>;
}