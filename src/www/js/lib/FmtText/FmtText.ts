import {FmtTextToken} from "./FmtTextToken.js";

/**
 * An output-independent representation of formatted text of the kind produced by a word processor.
 *
 * FmtText can be understood as an array of printable and non-printable characters, spaces, breaks of different
 * kinds (paragraph, column, page, section, etc) and non-textual inserts (figures, formulae, etc) each of which
 * potentially having a set of attributes (font family, font size, style, etc).
 *
 * Explicitly, FmtText is an array of FmtTextToken, but a single token and simple strings can be understood
 * as trivial implicit FmtText.
 */
type FmtText = FmtTextToken[] | FmtTextToken | string;

// export interface FmtTextToken {
//     /**
//      * Defaults to 'text'
//      */
//     type?: string;
//
//     text: string;
//
//     style?: string;
//     fontStyle?: string;
//     fontWeight?: string;
//     verticalAlign?: string;
//     fontSize?: string;
//     classList?: string;
//     textDirection?: string;
//
//
//     space?: string| number;
//     markType?: string;
//
//
//     /**
//      * For glue tokens
//      */
//     width?: number;
//     stretch?: number;
//     shrink?: number;
//
// }