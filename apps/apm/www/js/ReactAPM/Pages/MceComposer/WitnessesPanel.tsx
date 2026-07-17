import {MceDataInterface} from "@/MceData/MceDataInterface";
import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";
import './WitnessesPanel.css';
import EditableTextField from "@/ReactAPM/Components/EditableTextField";
import NiceToggle from "@/ReactAPM/Components/NiceToggle/NiceToggle";


interface WitnessesPanelProps extends TabbableElementProps {
  mceData: MceDataInterface;
  onChangeSiglum?: (witnessIndex: number, newSiglum: string) => boolean,
  onChangeIncludeInAutoMarginalFoliation?: (witnessIndex: number, newState: boolean) => boolean,
}

interface WitnessTableRow {
  siglum: string,
  title: string,
  includeInAutoMarginalFoliation: boolean
}

interface SiglaGroupsTableRow {
  siglum: string,
  sigla: string[]
}

export default function WitnessesPanel({mceData, onChangeSiglum, onChangeIncludeInAutoMarginalFoliation}: WitnessesPanelProps) {

  if (mceData.sigla.length === 0) {
    return <>No sigla defined</>;
  }

  const witnessTableRows: WitnessTableRow[] = mceData.sigla.map((siglum, index) => {
    const witness = mceData.witnesses[index];
    let title = witness.title;
    if (witness.localWitnessId !== undefined && witness.localWitnessId !== 'A') {
      title = `${title} (${witness.localWitnessId})`;
    }
    const includeInAutoMarginalFoliationState = mceData.includeInAutoMarginalFoliation?.includes(index) ?? false;
    return {siglum, title, includeInAutoMarginalFoliation: includeInAutoMarginalFoliationState};
  });


  const witnessesTableColumnDefs: NiceTableColumnDef<WitnessTableRow>[] = [
    {
      key: "n",
      title: 'N',
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
      cellContent: (witnessData, witnessIndex) => <EditableTextField text={witnessData.siglum} onConfirm={(newSiglum) => {
        if (onChangeSiglum) {
          onChangeSiglum(witnessIndex, newSiglum);
        } }}/>
    },
    {
      key: "margFol",
      title: 'Marg. Fol.',
      cellContent: (witnessData, witnessIndex) => <NiceToggle
        isOn={witnessData.includeInAutoMarginalFoliation}
        onTitle={`Click to exclude ${witnessData.title} from auto marginal foliation`}
        offTitle={`Click to include ${witnessData.title} in auto marginal foliation`}
        onClick={(newState) => {
          if (onChangeIncludeInAutoMarginalFoliation) {
            onChangeIncludeInAutoMarginalFoliation(witnessIndex, newState);
          }
        }}
      />
    }
  ];

  const siglaGroupsTableRows: SiglaGroupsTableRow[] = mceData.siglaGroups.map((siglaGroup) => {
    return {
      siglum: siglaGroup.siglum,
      sigla: siglaGroup.witnesses.map((witnessIndex) => mceData.sigla[witnessIndex])
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
    }
  ];


  return (
    <div className={'witnesses-panel'}>
      <div className={'section witnesses'}>
        <h1>Witnesses</h1>
        <div className={'section-content'}>
          {witnessTableRows.length === 0 && <>No witnesses defined</>}
          {witnessTableRows.length > 0 && <NiceTable columnDefs={witnessesTableColumnDefs} rows={witnessTableRows}/>}
        </div>
      </div>
      <div className={'section sigla-groups'}>
        <h1>Sigla Groups</h1>
        <div className={'section-content'}>
          {siglaGroupsTableRows.length === 0 && <>No sigla groups defined</>}
          {siglaGroupsTableRows.length > 0 &&
            <NiceTable columnDefs={siglaGroupsTableColumnDefs} rows={siglaGroupsTableRows}/>}
        </div>

      </div>
    </div>
  );


}