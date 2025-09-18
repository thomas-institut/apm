import {useRef} from "react";


/*
 * Returns true if this is the first render of the component.
 *
 * Based on https://stackoverflow.com/questions/65027884/which-is-the-right-way-to-detect-first-render-in-a-react-component#66139558
 */
export default function useFirstRender() {
  const ref = useRef(true);
  const firstRender = ref.current;
  ref.current = false;
  return firstRender;
}