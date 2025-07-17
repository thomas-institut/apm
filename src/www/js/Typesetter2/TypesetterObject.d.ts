export class TypesetterObject {
    metadata: any;

    getExportObject(): { [key: string]:any};
    setFromObject(object: { [key: string]:any}, mergeValues: boolean) : this;
    addMetadata(key: string, someThing: any): this;
    getMetadata(key: string): any;
    deleteMetadata(key: string): this;
    hasMetadata(key: string): boolean;

    protected copyValues(template: { [key: string]:any}, inputObject: { [key: string]:any}, mergeValues:boolean): void;
}