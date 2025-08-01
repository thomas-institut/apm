import {FontDefinition} from "@/Typesetter2/FontConversions";


export class TextBoxFactory {
    static simpleText(text: string, fontSpec: FontDefinition = {}, textDirection: 'rtl'|'ltr'|'' = ''): TextBox;
}