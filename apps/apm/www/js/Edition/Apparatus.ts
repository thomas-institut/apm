import {ApparatusEntryInterface, ApparatusInterface, MetadataInterface} from "./EditionInterface.js";
import {ApparatusEntry} from "./ApparatusEntry.js";


export class Apparatus implements ApparatusInterface {
  type: string = '';
  entries: ApparatusEntry[] = [];
  metadata?: MetadataInterface | undefined;

  // rawEntries?: ApparatusEntry[] | undefined;

  setFromInterface(app: ApparatusInterface): this {
    this.type = app.type;
    this.entries = app.entries.map((entry: ApparatusEntryInterface) => {
      return new ApparatusEntry().setFromInterface(entry);
    });
    this.metadata = app.metadata;
    // this.rawEntries = app.rawEntries
    return this;
  }

}