
interface LogoProps {
  url?: string;
  alt?: string;
  className?: string;
  size?: number;
}

export default function Logo({url, alt, className, size}: LogoProps) {
  size = size ?? 32;
  alt = alt ?? 'APE';
  if (!url) {
    return <span className={className}>{alt}</span>;
  }
  return (
    <img height={size} src={url} alt={alt} />
  );
}
