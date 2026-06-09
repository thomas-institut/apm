import {
  FmtText, FONT_STYLE_ITALIC, FONT_WEIGHT_BOLD,
  MARK_TYPE_PARAGRAPH,
  TOKEN_TYPE_EMPTY,
  TOKEN_TYPE_GLUE,
  TOKEN_TYPE_MARK,
  TOKEN_TYPE_TEXT, VALIGN_SUBSCRIPT, VALIGN_SUPERSCRIPT
} from "@thomas-inst/fmt-text";
import {CSSProperties} from "react";


interface FmtTextSpanProps {
  fmtText: FmtText;
  className?: string;
  ignoreEmptyText?: boolean
  ignoreEmptyTokens?: boolean
}


export function FmtTextSpan({fmtText, className, ignoreEmptyText, ignoreEmptyTokens}: FmtTextSpanProps) {
  ignoreEmptyText = ignoreEmptyText ?? true;
  ignoreEmptyTokens = ignoreEmptyTokens ?? true;
  if (fmtText.length === 0 && ignoreEmptyText) {
    return null;
  }
  if (ignoreEmptyTokens) {
    fmtText = fmtText.filter(token => token.type !== TOKEN_TYPE_EMPTY);
  }

  return <span className={className}>{
    fmtText.map((token, index) => {
      switch (token.type) {
        case TOKEN_TYPE_EMPTY:
          return '';

        case TOKEN_TYPE_GLUE:
          return ' ';

        case TOKEN_TYPE_MARK:
          switch(token.markType) {
            case MARK_TYPE_PARAGRAPH:
              return '\x00b6';

            default:
              return `[${token.altText}]`;
          }

        case TOKEN_TYPE_TEXT:
          let s = <>{token.text}</>;
          if (token.fontWeight === FONT_WEIGHT_BOLD) {
            s = <b>{s}</b>
          }
          if (token.fontStyle === FONT_STYLE_ITALIC) {
            s = <i>{s}</i>
          }
          const classes: string[] = [];
          let fontSize = 1;
          if (token.classList !== undefined && token.classList !== null && token.classList !== '') {
            classes.push(...token.classList.split(' '));
          }
          if (token.verticalAlign === VALIGN_SUBSCRIPT) {
            classes.push('subscript');
            fontSize = 0.7;
          }
          if (token.verticalAlign === VALIGN_SUPERSCRIPT) {
            classes.push('superscript');
            fontSize = 0.7;
          }
          if (token.fontSize !== undefined) {
            fontSize = token.fontSize;
          }
          const styles:CSSProperties = fontSize === 1 ? {} : {
            fontSize: `${fontSize}em`
          }
          return <span key={index} className={classes.join(' ')} style={styles}>{s}</span>

        default:
          return '';
      }
    })
  }</span>
}
