import {MceDataInterface} from "@/MceData/MceDataInterface";
import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";


interface SiglaPanelProps extends TabbableElementProps {
  mceData: MceDataInterface;
}

interface SiglumData {
  siglum: string,
  title: string
}

export default function SiglaPanel({mceData}: SiglaPanelProps) {

  if (mceData.sigla.length === 0) {
    return <>No sigla defined</>;
  }

  const siglaData: SiglumData[] = mceData.sigla.map((siglum, index) => {
    const witness = mceData.witnesses[index];
    let title = witness.title;
    if (witness.localWitnessId !== undefined && witness.localWitnessId !== 'A') {
      title = `${title} (${witness.localWitnessId})`;
    }
    return {siglum, title};
  });

  const columnDef: NiceTableColumnDef<SiglumData>[] = [
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

  return (
    <div className={'sigla-panel'}>
      <div className={'section sigla'}>
        <h1>Sigla</h1>
        <div className={'section-content'}>
          <NiceTable className={'section-content'} columnDefs={columnDef} rows={siglaData} oddEvenHighlight={false}/>
        </div>
      </div>
      <div className={'section sigla-groups'}>
        <h1>Sigla Groups</h1>
        <div className={'section-content'}>
          {mceData.siglaGroups.length === 0 && <>No sigla groups defined</>}
          {mceData.siglaGroups.length > 0 && <>Sigla Groups Panel will be here, there are {mceData.siglaGroups.length} sigla
            groups defined</>}
        </div>

      </div>
    </div>
  );


}