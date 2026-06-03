// @ts-ignore
import GI from 'node-gtk';
import {PangoMeasurerNodeGTK} from "../../PangoMeasurer/PangoMeasurerNodeGTK.js";

const Pango = GI.require('Pango');

interface MeasureInput {
  text: string;
  fontFamily: string;
  fontSize: number;
}

interface MeasureOutput {
  text: string;
  fontFamily: string;
  fontSize: number;
  measurements: {
    width: number;
    height: number;
  };
}

export class Measure implements Action<MeasureInput, MeasureOutput> {

  async execute(input: MeasureInput): Promise<MeasureOutput> {
    const {text, fontFamily, fontSize} = input;
    let measurer = new PangoMeasurerNodeGTK();
    const scale = 1000;
    let measurements = measurer.measureText(text, `${fontFamily} ${scale * fontSize}`);
    return {
      text: text,
      fontFamily: fontFamily,
      fontSize: fontSize,
      measurements: {
        width: measurements.logical.width / (Pango.SCALE * scale),
        height: measurements.logical.height / (Pango.SCALE * scale)
      }
    };
  }
}
