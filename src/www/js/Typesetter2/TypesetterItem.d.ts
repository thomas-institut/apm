import {TypesetterObject} from "./TypesetterObject";

export class TypesetterItem extends TypesetterObject{
    direction: number;
    textDirection: string;
    width: number;
    height: number;
    shiftX: number;
    shiftY: number;

    getDirection(): number;
    getTextDirection(): string;
    getWidth(): number;
    getHeight(): number;
    getShiftX(): number;
    getShiftY(): number;

    setTextDirection(textDirection: string): this;
    setLeftToRight(): this;
    setRightToLeft(): this;
    setWidth(width: number): this;
    setHeight(height: number): this;
    setShiftX(shiftX: number): this;
    setShiftY(shiftY: number): this;

}