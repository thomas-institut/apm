import {WitnessDataItem} from "@/Edition/WitnessDataItem";
import {NumeralSystems} from "@/toolbox/NumeralSystems";

const forceHandOneDisplaySelectValue = 'forceZero';

interface WitnessDataSelectorProps {
  sigla: string[];
  lang: string;
  witnessData: WitnessDataItem[];
  maxHand?: number;
  onChange: (witnessData: WitnessDataItem[]) => void;
}

export default function WitnessDataSelector({sigla, lang, witnessData, maxHand = 4, onChange}: WitnessDataSelectorProps) {
  const numHands = Math.max(maxHand, 2);

  const getNumberString = (n: number) => lang === 'ar' ? NumeralSystems.toEasternArabic(n) : NumeralSystems.toWesternArabic(n);

  const changeWitness = (witnessIndex: number, selected: boolean, handSelectValue: string) => {
    const newData: WitnessDataItem[] = [];
    sigla.forEach((siglum, i) => {
      if (siglum === '-') {
        // the edition witness is not listed
        return;
      }
      const existing = witnessData.find(item => item.witnessIndex === i);
      let isSelected = existing !== undefined;
      let hand = existing?.hand ?? 0;
      let forceHandDisplay = existing?.forceHandDisplay ?? false;
      if (i === witnessIndex) {
        isSelected = selected;
        if (handSelectValue === forceHandOneDisplaySelectValue) {
          hand = 0;
          forceHandDisplay = true;
        } else {
          hand = parseInt(handSelectValue);
          forceHandDisplay = false;
        }
      }
      if (isSelected) {
        const item = new WitnessDataItem().setWitnessIndex(i).setHand(hand);
        item.forceHandDisplay = forceHandDisplay;
        item.location = '';
        newData.push(item);
      }
    });
    onChange(newData);
  };

  return <div className="witness-data-selector">
    {sigla.map((siglum, index) => {
      if (siglum === '-') {
        return null;
      }
      const item = witnessData.find(wd => wd.witnessIndex === index);
      const checked = item !== undefined;
      const hand = item?.hand ?? 0;
      const forced = item?.forceHandDisplay ?? false;
      const handSelectValue = hand === 0 && forced ? forceHandOneDisplaySelectValue : `${hand}`;
      return <div key={index} className="witness-data-item">
        <label className="form-check">
          <input className={`form-check-input siglum-checkbox siglum-checkbox-${index}`} type="checkbox"
                 checked={checked}
                 onChange={(ev) => changeWitness(index, ev.target.checked, handSelectValue)}/>
          <span className="form-check-label">{siglum}</span>
        </label>
        <select className={`hand-select hand-select-${index}`} title="Hand" value={handSelectValue}
                aria-label={`Hand for ${siglum}`}
                onChange={(ev) => changeWitness(index, checked, ev.target.value)}>
          <option value="0">-</option>
          <option value={forceHandOneDisplaySelectValue}>{getNumberString(1)}</option>
          {Array.from({length: numHands - 1}, (_, k) => k + 1).map(h =>
            <option key={h} value={h}>{getNumberString(h + 1)}</option>)}
        </select>
      </div>;
    })}
  </div>;
}
