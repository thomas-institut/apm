import {ApparatusEntry} from "./ApparatusEntry";


export interface Apparatus {
  type: string;
  entries: ApparatusEntry[];
  rawEntries?: ApparatusEntry[];
}
