import {CSSProperties, ReactNode} from "react";

import './Skeleton.css';

interface SkeletonProps {
  as?: 'span' | 'div';
  darkColor?: string;
  lightColor?: string;
  style?: CSSProperties;
  animationPeriod?: number;
  children?: ReactNode;
}

export default function Skeleton(props: SkeletonProps) {

  const as = props.as ?? 'span';
  const darkColor = props.darkColor ?? '#c1c1c1';
  const lightColor = props.lightColor ?? '#fafafa';

  let style = props.style ?? {};
  const animationStyle: CSSProperties = {
    background: `linear-gradient(90deg, ${darkColor}, ${lightColor}, ${darkColor})`,
    backgroundSize: '200% 200%',
    animation: `skeletonGradient ${props.animationPeriod ?? 2}s linear infinite`,
  }

  style = {...style, ...animationStyle};

  if (as === 'span') {
    return <span style={style}>{props.children}</span>
  } else {
    return <div style={style}>{props.children}</div>
  }


}