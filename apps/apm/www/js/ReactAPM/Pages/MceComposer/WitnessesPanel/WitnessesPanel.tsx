import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";
import './WitnessesPanel.css';
import EditableTextField from "@/ReactAPM/Components/EditableTextField";
import NiceToggle from "@/ReactAPM/Components/NiceToggle/NiceToggle";
import {SiglaGroupInterface} from "@/CtData/CtDataInterface";
import {useState} from "react";
import {nextTick} from "@/ReactAPM/ToolBox/NextTick";
import ComponentWithPending from "@/ReactAPM/Components/ComponentWithPending";
import SiglaGroupsPanel from "@/ReactAPM/Components/SiglaGroupsPanel/SiglaGroupsPanel";


export interface WitnessData {
  siglum: string,
  title: string,
  includeInAutoMarginalFoliation: boolean
}

interface WitnessesPanelProps extends TabbableElementProps {
  witnesses: WitnessData[],
  siglaGroups: SiglaGroupInterface[],
  onChangeSiglum?: (witnessIndex: number, newSiglum: string) => boolean | Promise<boolean>,
  /**
   * Callback to validate a witness siglum
   *
   * Must return true if the witness siglum at witnessIndex can be changed to the given siglum
   * or a string with the error message if it cannot.
   */
  isSiglumValid: (witnessIndex: number, siglum: string) => true | string,
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

export default function WitnessesPanel({
                                         witnesses,
                                         siglaGroups,
                                         onChangeSiglum,
                                         isSiglumValid,
                                         onChangeIncludeInAutoMarginalFoliation,
                                         onDeleteSiglaGroup,
                                         onChangeSiglaGroup,
                                         isSiglaGroupValid
                                       }: WitnessesPanelProps) {

  const [changingMarginalFoliationIndex, setChangingMarginalFoliationIndex] = useState<number | null>(null);
  const [changingSiglumIndex, setChangingSiglumIndex] = useState<number | null>(null);

  if (witnesses.length === 0) {
    return <div className={'witnesses-panel no-edition'}><p>No witnesses defined</p></div>;
  }

  const sigla = witnesses.map(witness => witness.siglum);


  const isAnyPending = changingSiglumIndex !== null || changingMarginalFoliationIndex !== null;

  const onClickMarginalFoliation = async (witnessIndex: number, newState: boolean) => {
    console.log(`onClickMarginalFoliation(${witnessIndex}, ${newState})`);
    if (onChangeIncludeInAutoMarginalFoliation && !isAnyPending) {
      setChangingMarginalFoliationIndex(witnessIndex);
      await nextTick();
      try {
        await onChangeIncludeInAutoMarginalFoliation(witnessIndex, newState);
        await nextTick();
      } catch (error) {
        console.error(`Error changing marginal foliation for witness at index ${witnessIndex}`, error);
      } finally {
        setChangingMarginalFoliationIndex(null);
      }
    }
  };

  const onConfirmEditSiglum = async (witnessIndex: number, newSiglum: string) => {
    console.log(`onConfirmEditSiglum(${witnessIndex}, ${newSiglum})`);
    if (onChangeSiglum && !isAnyPending) {
      setChangingSiglumIndex(witnessIndex);
      await nextTick();
      try {
        await onChangeSiglum(witnessIndex, newSiglum);
        await nextTick();
      } catch (error) {
        console.error(`Error changing siglum for witness at index ${witnessIndex}`, error);
      } finally {
        setChangingSiglumIndex(null);
      }
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
      cellContent: (witnessData, witnessIndex) => <ComponentWithPending pending={changingSiglumIndex === witnessIndex}>
        <EditableTextField text={witnessData.siglum}
                           validator={(newSiglum) => isSiglumValid(witnessIndex, newSiglum)}
                           onConfirm={(newSiglum) => onConfirmEditSiglum(witnessIndex, newSiglum)}/>
      </ComponentWithPending>
    },
    {
      key: "margFol",
      title: 'Marg. Fol.',
      cellContent: (witnessData, witnessIndex) => <ComponentWithPending
        pending={changingMarginalFoliationIndex === witnessIndex}>
        <NiceToggle
          className={isAnyPending ? 'grayed-out': ''}
          isOn={witnessData.includeInAutoMarginalFoliation}
          onTitle={`Click to exclude ${witnessData.title} from auto marginal foliation`}
          offTitle={`Click to include ${witnessData.title} in auto marginal foliation`}
          onClick={(newState) => onClickMarginalFoliation(witnessIndex, newState)}
        />
      </ComponentWithPending>
    }
  ];

  return (
    <div className={'witnesses-panel'}>
      <div className={'section witnesses'}>
        <h1>Witnesses</h1>
        <div className={'section-content'}>
          {witnesses.length === 0 && <>No witnesses defined</>}
          {witnesses.length > 0 && <NiceTable columnDefs={witnessesTableColumnDefs} rows={witnesses}/>}
        </div>
      </div>
      <SiglaGroupsPanel sigla={sigla}
                        siglaGroups={siglaGroups}
                        isSiglaGroupValid={isSiglaGroupValid}
                        onDeleteSiglaGroup={onDeleteSiglaGroup}
                        onChangeSiglaGroup={onChangeSiglaGroup}
                        disabled={isAnyPending}/>
    </div>
  );


}