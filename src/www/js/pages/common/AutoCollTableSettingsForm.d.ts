interface WitnessData {
    type: string;
    systemId: string;
    title: string;
    toInclude?: boolean;
    internalId?: string;
    typeSpecificInfo: {
        docId: string;
        localWitnessId: string;
    };
}



export declare class AutomaticCollationTableSettingsForm {
    constructor(options: any);

    show(newSettings?: any): void;
    hide(): void;
    isHidden(): boolean;
    setPresetTitle(): void;
    setNormalizersDiv(): void;
    setSettings(settings?: any): void;
    systemIdsCorrespond(sysId1: string, sysId2: string): boolean;
    getInternalIdFromWitness(witness: WitnessData): string;
    getWitnessFromSystemId(systemId: string): WitnessData | false;
    dealWithNotEnoughWitnessesToInclude(): boolean;
    on(eventName:string, f: any): void;

    private _saveAndAddEventListenersAvailableWitnessBox(): void;
    private _removeEventListenersAvailableWitnessBox(): void;
    private _saveAndAddEventListenersWitnessesToIncludeBox(): void;
    private _removeEventListenersWitnessesToIncludeBox(): void;

    readonly cancelEventName: string;
    readonly applyEventName: string;
    readonly settingsChangeEventName: string;
    readonly dragElementClass: string;
    readonly overClass: string;
    readonly overBoxClass: string;
    readonly witnessDraggableClass: string;
    readonly automaticCollationPresetTool: string;
    readonly notEnoughWitnessesWarningHtml: string;

    private readonly options: any;
    private readonly witnessList: WitnessData[];
    private readonly initialSettings: any;
    private readonly verbose: boolean;
    private readonly debug: boolean;
    private readonly container: JQuery;
    private readonly formTitle: JQuery;
    private readonly normalizersDiv: JQuery;
    private readonly cancelButton: JQuery;
    private readonly applyButton: JQuery;
    private readonly allButton: JQuery;
    private readonly noneButton: JQuery;
    private readonly ignorePunctuationCheckbox: JQuery;
    private readonly witnessesAvailableSelectBox: JQuery;
    private readonly witnessesToIncludeBox: JQuery;
    private readonly warningDiv: JQuery;
    private readonly presetTitle: JQuery;
    private readonly editPresetButton: JQuery;
    private readonly editPresetDiv: JQuery;
    private readonly presetInputText: JQuery;
    private readonly presetSaveButton: JQuery;
    private readonly presetSave2Button: JQuery;
    private readonly presetCancelButton: JQuery;
    private readonly presetErrorSpan: JQuery;
    private readonly presetErrorMsg: JQuery;
}