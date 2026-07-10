import {MceDataInterface} from "@/MceData/MceDataInterface";
import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";
import './WitnessesPanel.css';


interface WitnessesPanelProps extends TabbableElementProps {
  mceData: MceDataInterface;
}

interface WitnessTableRow {
  siglum: string,
  title: string
}

interface SiglaGroupsTableRow {
  siglum: string,
  sigla: string[]
}

export default function WitnessesPanel({mceData}: WitnessesPanelProps) {

  if (mceData.sigla.length === 0) {
    return <>No sigla defined</>;
  }

  const witnessTableRows: WitnessTableRow[] = mceData.sigla.map((siglum, index) => {
    const witness = mceData.witnesses[index];
    let title = witness.title;
    if (witness.localWitnessId !== undefined && witness.localWitnessId !== 'A') {
      title = `${title} (${witness.localWitnessId})`;
    }
    return {siglum, title};
  });


  const witnessesTableColumnDefs: NiceTableColumnDef<WitnessTableRow>[] = [
    {
      key: "n",
      title: 'N',
      width: '2em',
      cellContent: (_siglumData, rowIndex) => <>{rowIndex + 1}</>,
    },
    {
      key: "witness",
      title: 'Witness',
      cellContent: (siglumData) => <>{siglumData.title}</>
    },
    {
      key: "siglum",
      title: 'Siglum',
      width: '5em',
      tdClassName: 'siglum',
      cellContent: (siglumData) => <>{siglumData.siglum}</>
    },
    {
      key: "margFol",
      title: 'Marg. Fol.',
      cellContent: (_siglumData) => <></>
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