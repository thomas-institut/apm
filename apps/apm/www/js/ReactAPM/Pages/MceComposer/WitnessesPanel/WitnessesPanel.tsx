import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";
import './WitnessesPanel.css';
import EditableTextField from "@/ReactAPM/Components/EditableTextField";
import NiceToggle from "@/ReactAPM/Components/NiceToggle/NiceToggle";
import {SiglaGroupInterface} from "@/CtData/CtDataInterface";
import {Pencil, Trash} from "react-bootstrap-icons";
import {Button} from "react-bootstrap";
import {useState} from "react";
import EditSiglaGroup from "@/ReactAPM/Pages/MceComposer/WitnessesPanel/EditSiglaGroup";
import ConfirmDialog from "@/ReactAPM/Components/ConfirmDialog";
import {getSiglaGroupString} from "@/ReactAPM/Pages/MceComposer/SiglaGroupUtil";
import {nextTick} from "@/ReactAPM/ToolBox/NextTick";
import ComponentWithPending from "@/ReactAPM/Components/ComponentWithPending";


export interface WitnessData {
  siglum: string,
  title: string,
  includeInAutoMarginalFoliation: boolean
}

interface WitnessesPanelProps extends TabbableElementProps {
  witnesses: WitnessData[],
  siglaGroups: SiglaGroupInterface[],
  onChangeSiglum?: (witnessIndex: number, newSiglum: string) => boolean | Promise<boolean>,
  onChangeIncludeInAutoMarginalFoliation?: (witnessIndex: number, newState: boolean) => boolean | Promise<boolean>,
  /**
   * Callback to delete a sigla group
   */
  onDeleteSiglaGroup?: (siglaGroupIndex: number) => boolean | Promise<boolean>,
  /**
   * Callback to change a sigla group
   *
   * If siglaGroupIndex is -1, then the sigla group is being added
   */
  onChangeSiglaGroup?: (siglaGroupIndex: number, newGroup: SiglaGroupInterface) => boolean | Promise<boolean>,
  /**
   * Callback to validate a sigla group
   *
   * Must return true if the sigla group at siglaGroupIndex can be changed to the given group (or added
   * if siglaGroupIndex is -1) or a string with the error message if it cannot.
   */
  isSiglaGroupValid: (siglaGroupIndex: number, group: SiglaGroupInterface) => true | string,
}

interface SiglaGroupsTableRow {
  siglum: string,
  sigla: string[]
}

export default function WitnessesPanel({
                                         witnesses,
                                         siglaGroups,
                                         onChangeSiglum,
                                         onChangeIncludeInAutoMarginalFoliation,
                                         onDeleteSiglaGroup,
                                         onChangeSiglaGroup,
                                         isSiglaGroupValid
                                       }: WitnessesPanelProps) {

  const [editingSiglaGroupData, setEditingSiglaGroupData] = useState<null | {
    siglaGroupIndex: number,
    siglaGroup: SiglaGroupInterface
  }>(null);
  const [confirmDeleteSiglaGroupIndex, setConfirmDeleteSiglaGroupIndex] = useState<number | null>(null);
  const [changingMarginalFoliationIndex, setChangingMarginalFoliationIndex] = useState<number | null>(null);

  if (witnesses.length === 0) {
    return <>No witnesses defined</>;
  }

  const sigla = witnesses.map(witness => witness.siglum);

  const onClickMarginalFoliation = async (witnessIndex: number, newState: boolean) => {
    console.log(`onClickMarginalFoliation(${witnessIndex}, ${newState})`);
    if (onChangeIncludeInAutoMarginalFoliation && changingMarginalFoliationIndex === null) {
      setChangingMarginalFoliationIndex(witnessIndex);
      await nextTick();
      await onChangeIncludeInAutoMarginalFoliation(witnessIndex, newState);
      setChangingMarginalFoliationIndex(null);
    }
  };

  const witnessesTableColumnDefs: NiceTableColumnDef<WitnessData>[] = [
    {
      key: "n",
      title: '#',
      width: '2em',
      cellContent: (_witnessData, witnessIndex) => <>{witnessIndex + 1}</>,
    },
    {
      key: "witness",
      title: 'Witness',
      cellContent: (witnessData) => <>{witnessData.title}</>
    },
    {
      key: "siglum",
      title: 'Siglum',
      width: '5em',
      tdClassName: 'siglum',
      cellContent: (witnessData, witnessIndex) => <EditableTextField text={witnessData.siglum}
                                                                     onConfirm={async (newSiglum) => {
                                                                       if (onChangeSiglum) {
                                                                         await onChangeSiglum(witnessIndex, newSiglum);
                                                                       }
                                                                     }}/>
    },
    {
      key: "margFol",
      title: 'Marg. Fol.',
      cellContent: (witnessData, witnessIndex) => <ComponentWithPending pending={changingMarginalFoliationIndex === witnessIndex}>
        <NiceToggle
          isOn={witnessData.includeInAutoMarginalFoliation}
          onTitle={`Click to exclude ${witnessData.title} from auto marginal foliation`}
          offTitle={`Click to include ${witnessData.title} in auto marginal foliation`}
          onClick={(newState) => onClickMarginalFoliation(witnessIndex, newState)}
        />
      </ComponentWithPending>
    }
  ];

  const siglaGroupsTableRows: SiglaGroupsTableRow[] = siglaGroups.map((siglaGroup) => {
    return {
      siglum: siglaGroup.siglum,
      sigla: siglaGroup.witnesses.map(witnessIndex => witnesses[witnessIndex]?.siglum ?? '')
    };
  });

  const siglaGroupsTableColumnDefs: NiceTableColumnDef<SiglaGroupsTableRow>[] = [
    {
      key: "n",
      title: 'N',
      width: '2em',
      cellContent: (_siglumData, rowIndex) => <>{rowIndex + 1}</>,
    },
    {
      key: "siglum",
      title: 'Group Siglum',
      cellContent: (siglumData) => <>{siglumData.siglum}</>
    },
    {
      key: "sigla",
      title: 'Sigla',
      cellContent: (siglumData) => <>{siglumData.sigla.join(' ')}</>
    },
    {
      key: 'controls',
      title: '',
      cellContent: (_siglumData, rowIndex) => <>
        <Trash onClick={() => {
          setConfirmDeleteSiglaGroupIndex(rowIndex);
        }}/>
        <Pencil onClick={() => {
          setEditingSiglaGroupData({
            siglaGroupIndex: rowIndex,
            siglaGroup: siglaGroups[rowIndex]
          });
        }}/>
      </>
    }
  ];

  const handleAcceptDeleteSiglaGroup = async () => {
    if (confirmDeleteSiglaGroupIndex === null || onDeleteSiglaGroup === undefined) {
      return;
    }
    await onDeleteSiglaGroup(confirmDeleteSiglaGroupIndex);
    setConfirmDeleteSiglaGroupIndex(null);
  };

  const handleCancelDeleteSiglaGroup = () => {
    setConfirmDeleteSiglaGroupIndex(null);
  };

  const siglaGroupToDelete = confirmDeleteSiglaGroupIndex === null ? null : siglaGroups[confirmDeleteSiglaGroupIndex] ?? null;
  const siglaGroupToDeleteLabel = siglaGroupToDelete === null ? '' : getSiglaGroupString(siglaGroupToDelete, sigla);


  return (
    <div className={'witnesses-panel'}>
      <div className={'section witnesses'}>
        <h1>Witnesses</h1>
        <div className={'section-content'}>
          {witnesses.length === 0 && <>No witnesses defined</>}
          {witnesses.length > 0 && <NiceTable columnDefs={witnessesTableColumnDefs} rows={witnesses}/>}
        </div>
      </div>
      <div className={'section sigla-groups'}>
        <h1>Sigla Groups</h1>
        <div className={'section-content'}>
          {siglaGroupsTableRows.length === 0 && <div>No sigla groups defined</div>}
          {siglaGroupsTableRows.length > 0 &&
            <NiceTable columnDefs={siglaGroupsTableColumnDefs} rows={siglaGroupsTableRows}/>}
          <Button variant={'outline-secondary'} size={'sm'} className={'add-sigla-group'} onClick={() => {
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
        isSiglaGroupValid={(siglaGroupIndex, group) => {
          if (isSiglaGroupValid === undefined) {
            return true;
          }
          return isSiglaGroupValid(siglaGroupIndex, group);
        }}
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
        onClickCancel={() => {
          setEditingSiglaGroupData(null);
        }}
      />}
      <ConfirmDialog
        show={confirmDeleteSiglaGroupIndex !== null}
        onHide={() => {
          setConfirmDeleteSiglaGroupIndex(null);
        }}
        onCancel={handleCancelDeleteSiglaGroup}
        onAccept={handleAcceptDeleteSiglaGroup}
        body={`Are you sure you want to remove sigla group ${siglaGroupToDeleteLabel} from the edition?`}
      />
    </div>
  );


}