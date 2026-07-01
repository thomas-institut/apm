import './ProgressBar.css';

interface ProgressBarProps {
  currentStep: number;
  numSteps: number;
  getLabel: (currentStep: number, numSteps: number) => string;
  /**
   *
   * The color of the progress bar fill.
   *
   * If not given, it inherits the background color of the parent element, which might
   * result in the bar being invisible. In CSS set the background-color property of
   * the `progress-bar-fill` class to the desired fill color
   */
  barColor?: string;
  /**
   *
   * The color of the text displayed on the progress bar.
   *
   * If not given, it uses the text color of the parent element.
   */
  textColor?: string;
  width?: number;
  height?: number;
  /**
   *
   * The CSS class name to apply to the progress bar's div element.
   *
   * If the bar's colors need to be set in CSS, use the `progress-bar-fill` sub-class for the
   * fill color and this class's color for the text color.
   *
   * For example, this will show a progress bar with a blue fill and black text on a white background:
   *
   * ```css
   * .my-bar {
   *    color: black;
   *    background-color: white
   *
   *    .progress-bar-fill {
   *      background-color: blue
   *    }
   * }
   * ```
   */
  className?: string;
}

/**
 *
 * A progress bar component that displays the current step and total steps.
 *
 * @param props
 * @constructor
 */
export default function ProgressBar(props: ProgressBarProps) {

  const height = props.height === undefined ? '100%' : `${props.height}px`;
  const width = props.width ?? 100;
  const ratio = props.numSteps > 0 ? props.currentStep / props.numSteps : 0;
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const completionPercentage = clampedRatio * 100;
  const className = props.className === undefined ? 'progress-bar' : `progress-bar ${props.className}`;

  return <div
    className={className}
    style={{
      width: `${width}px`,
      height,
      color: props.textColor,
    }}
  >
    <div
      className={'progress-bar-fill'}
      style={{
        width: `${completionPercentage}%`,
        backgroundColor: props.barColor,
      }}
    ></div>
    <span className={'progress-bar-label'}>{props.getLabel(props.currentStep, props.numSteps)}</span>
  </div>;

}