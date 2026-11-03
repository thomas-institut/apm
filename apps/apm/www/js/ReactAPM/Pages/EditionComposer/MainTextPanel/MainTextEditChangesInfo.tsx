import {WitnessTokenInterface} from '@/CtData/CtDataInterface';
import {MainTextEditChange} from '@/Edition/MainTextEditChanges';
import * as WitnessTokenType from '@/Witness/WitnessTokenType';

interface MainTextEditChangesInfoProps {
  changes: MainTextEditChange[];
}

export function WitnessTokenDisplay({token}: {token: WitnessTokenInterface | null | undefined}) {
  if (token === null || token === undefined) {
    return <em>empty</em>;
  }
  if (token.tokenType === WitnessTokenType.FORMAT_MARK) {
    return <span className="witness-token-format-mark">¶ {token.style}</span>;
  }
  if (token.tokenType === WitnessTokenType.NUMBERING_LABEL) {
    return <span className="witness-token-numbering-label">{token.text}</span>;
  }
  if (token.tokenType === WitnessTokenType.EMPTY) {
    return <em>empty</em>;
  }
  return <span className={`witness-token witness-token-${token.tokenType}`}>{token.text}</span>;
}

function getChangeDescription(change: MainTextEditChange) {
  switch (change.change) {
    case 'replace':
      return <><WitnessTokenDisplay token={change.currentToken}/> → <WitnessTokenDisplay token={change.newToken}/></>;
    case 'delete':
      return <><WitnessTokenDisplay token={change.currentToken}/> → <em>empty</em></>;
    case 'add':
      return <><WitnessTokenDisplay token={change.currentToken}/> <em>add</em> <WitnessTokenDisplay token={change.newToken}/></>;
  }
}

export default function MainTextEditChangesInfo({changes}: MainTextEditChangesInfoProps) {
  return <div className="main-text-edit-changes-info">
    <p>{changes.length === 1 ? 'There is 1 change:' : `There are ${changes.length} changes:`}</p>
    <details>
      <summary>Revisions</summary>
      <ol>
        {changes.map((change, index) => <li key={`revision-${index}`}>
          {change.index === -1 ? 'Before first token' : `Token ${change.index + 1}`}: {getChangeDescription(change)}
        </li>)}
      </ol>
    </details>
    <details>
      <summary>Collation Table Changes</summary>
      <ol>
        {changes.map((change, index) => <li key={`ct-change-${index}`}>
          {change.index === -1 ? 'Column 1' : `Column ${change.index + 1}`}: {getChangeDescription(change)}
        </li>)}
      </ol>
    </details>
  </div>;
}