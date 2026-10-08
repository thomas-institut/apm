import {FmtText} from "@thomas-inst/fmt-text";
import {Fragment} from "react";


interface FmtTextRendererProps {
  t: FmtText;
  index: number;
  tokenClasses?: string[];
  tokenIndexClassPrefix?: string;
  textClasses?: string[];
  glueClasses?: string[];
}

export default function FmtTextRenderer({t,
  index,
                                          tokenClasses = [],
                                          tokenIndexClassPrefix='',
                                          textClasses = [], glueClasses = []}: FmtTextRendererProps) {

  const getClassNameForToken = (indexPrefix: string, index: number, tokenClasses:string[]): string => {
    const indexClass = indexPrefix !== '' ? `${indexPrefix}-${index}` : '';
    return [indexClass, ...tokenClasses].filter( c => c !== '').join(' ');
  }
  return <Fragment key={index}>
    {
      t.map( (token, tokenIndex) => {
        const key = tokenIndex;
        switch(token.type) {
          case 'text':
            const tokenClassList = token.classList ? token.classList.split(' ') : [];
            const textClassName = getClassNameForToken(tokenIndexClassPrefix, tokenIndex, [ ...tokenClasses, ...textClasses, ...tokenClassList]);

            let innerSpanElement = <>{token.text}</>;
            if (token.fontStyle === 'italic') {
              innerSpanElement = <i>{innerSpanElement}</i>;
            }
            if (token.fontWeight === 'bold') {
              innerSpanElement = <b>{innerSpanElement}</b>;
            }
            switch(token.verticalAlign) {
              case '':
              case undefined:
                if (token.fontSize !== undefined && token.fontSize <= 0.8) {
                  innerSpanElement = <small>{innerSpanElement}</small>;
                }
                break;

              case 'superscript':
                innerSpanElement = <sup>{innerSpanElement}</sup>;
                break;

              case 'subscript':
                innerSpanElement = <sub>{innerSpanElement}</sub>;
                break;
            }
            if (textClassName === '') {
              return <Fragment key={key}>{innerSpanElement}</Fragment>;
            }
            return <span key={key} className={textClassName}>{innerSpanElement}</span>;

          case 'glue':
            const glueClassName = getClassNameForToken(tokenIndexClassPrefix, tokenIndex, [ ...tokenClasses, ...glueClasses]);
            return <span key={key} className={glueClassName}> </span>;

          default: // 'mark' and 'empty'
            return null;
        }
      })
    }
  </Fragment>
}