import {MainTextToken} from "./MainTextToken.js";

export interface MainTextParagraph {
  type: string;
  tokens: MainTextToken[];
  /**
   * Vertical break to add after the paragraph
   */
  breakAfter?: 'section' | 'page';
}