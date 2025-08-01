import {IntrinsicTextDirection} from "@/Typesetter2/Bidi/BidiDisplayOrder";

export interface BidiOrderInfo {
    inputIndex: number;
    displayOrder: number;
    intrinsicTextDirection: IntrinsicTextDirection;
    textDirection: string;
    embeddingLevel: number;
}
