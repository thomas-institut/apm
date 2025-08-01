import {TypesetterItem} from "@/Typesetter2/TypesetterItem";


export interface FontConversionDefinition {
    from: FontDefinition;
    to: FontDefinition;
}

export interface FontDefinition {
    fontFamily?: string;
    fontStyle?: string;
    fontWeight?: string;
    fontSize?: number;
}
export class FontConversions {
    static applyFontConversions(item: TypesetterItem, fontConversionDefinitions: FontConversionDefinition[], defaultScript = 'la');
}