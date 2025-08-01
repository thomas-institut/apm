import {Box} from "@/Typesetter2/Box";

export class TextBox extends Box{
    text: string;
    fontFamily: string;
    fontStyle: string;
    fontWeight: string;
    fontSize: number;

    getText(): string;
    setText(text: string): this;
    getFontFamily(): string;
    setFontFamily(fontFamily: string): this;
    getFontStyle(): string;
    setFontStyle(fontStyle: string): this;
    getFontWeight(): string;
    setFontWeight(fontWeight: string): this;
    getFontSize(): number;
    setFontSize(fontSize: number): this;
    resetMeasurements(): void;
}