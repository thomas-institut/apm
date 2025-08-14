import {ApparatusEntry} from "./ApparatusEntry.js";


export interface Apparatus {
  type: string;
  entries: ApparatusEntry[];
  rawEntries?: ApparatusEntry[];
}
