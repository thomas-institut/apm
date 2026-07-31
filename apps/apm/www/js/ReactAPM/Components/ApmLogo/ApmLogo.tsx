import apmLogo from './apm-logo.svg';

interface ApmLogoProps {
  height: number;
  className?: string;
}

export default function ApmLogo({height, className}: ApmLogoProps) {
  return <img className={className} src={apmLogo} alt="APM Logo" height={height}/>;
}