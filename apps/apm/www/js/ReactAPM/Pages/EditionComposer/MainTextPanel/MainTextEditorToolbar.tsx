import {
  EditionMainTextEditorFormat,
  EditionMainTextEditorFormatState,
  formatButtons,
  headingDepth,
  headingIcons,
  simpleFormats
} from '@/EditionComposer/EditionMainTextEditor';
import {toolbarCharactersDefinition} from '@/EditionComposer/ToolbarCharactersDefinition';
import {isRtl} from '@/toolbox/Util';

interface MainTextEditorToolbarProps {
  lang: string;
  useLegacyFormatIcons?: boolean;
  formatState: EditionMainTextEditorFormatState;
  onToggleFormat: (format: EditionMainTextEditorFormat) => void;
  onToggleHeading: (headingNumber: number) => void;
  onInsertCharacter: (characterKey: string) => void;
}

const newIcons = {
  bold: <b>B</b>,
  italic: <i>I</i>,
  numberingLabel: <>x.y</>,
  small: <small>S</small>,
  superscript: <>x<sup>2</sup></>
}

export default function MainTextEditorToolbar({lang, formatState, onToggleFormat, onToggleHeading,
                                                onInsertCharacter, useLegacyFormatIcons = false}: MainTextEditorToolbarProps) {
  const preventEditorBlur = (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault();
  const separator = <span className="mte-tb-sep">&nbsp;</span>;

  return <div className={`fte-toolbar text-${lang}`}>
    {simpleFormats.map(format => <button key={format} type="button" className={`${format}-btn${formatState[format] ? ' on' : ''}`}
                                         title={formatButtons[format].title} onMouseDown={preventEditorBlur}
                                         onClick={() => onToggleFormat(format)}
    >{useLegacyFormatIcons ? formatButtons[format].icon : newIcons[format]}</button>)}
    {separator}
    {Array.from({length: headingDepth}, (_, index) => {
      const headingNumber = index + 1;
      return <button key={headingNumber} type="button" className={`heading${headingNumber}-btn${formatState.heading === headingNumber ? ' on' : ''}`}
                     title={`Heading ${headingNumber}`} onMouseDown={preventEditorBlur}
                     onClick={() => onToggleHeading(headingNumber)}
                     dangerouslySetInnerHTML={{__html: headingIcons[headingNumber]}}/>;
    })}
    {separator}
    {Object.keys(toolbarCharactersDefinition[lang]).map(characterKey => {
      const characterDefinition = toolbarCharactersDefinition[lang][characterKey];
      const character = isRtl(lang) && characterDefinition.rtlVersion !== undefined
        ? characterDefinition.rtlVersion
        : characterDefinition.character;
      return <button key={characterKey} type="button" className={`${characterKey}-btn`} title={characterDefinition.title}
                     onMouseDown={preventEditorBlur} onClick={() => onInsertCharacter(characterKey)}>{character}</button>;
    })}
  </div>;
}