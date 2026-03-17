export type InfoDivType = 'info' | 'warning' | 'error' | 'success';

interface InfoDivProps {
  type: InfoDivType,
  text: string
}

export function InfoDiv(props: InfoDivProps) {
  if (props.text === '') {
    return null;
  }
  return <div className={'text-' + props.type}>{props.text}</div>;
}