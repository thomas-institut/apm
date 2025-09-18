import {JSX, useEffect, useState} from "react";
import useFirstRender from "@/ReactAPM/Hooks/useFirstRender";

interface SmartDeferredDataComponentProps<T> {
  /**
   * Function that returns the data synchronously.
   * If the data is not available, it returns null.
   */
  syncGetter: () => T | null;
  /**
   * Function that returns a promise that resolves to the data asynchronously.
   * If the data is not available, throws an error.
   */
  asyncGetter: () => Promise<T>;
  /**
   * Element to display while the data is being loaded
   */
  placeholder: JSX.Element;
  /**
   * Function that takes an error and returns the JSX element to display when that error occurs.
   * If not set or if it returns null, the placeholder will continue to be displayed.
   */
  onError?: (error: any) => JSX.Element | null;
  /**
   * Function that takes the data and returns the JSX element to display when data is available.
   */
  onData: (data: T) => JSX.Element;

  /**
   * Every time this value changes to a new positive value, the data will be queried and rendered again.
   * Otherwise, if not set or if set to 0 or less and never changed, the data will only be queried once when the component is first rendered.
   */
  retry?: number;
}

/**
 * A component that displays data from a sync or async getter.
 *
 * If the data is not available after calling the sync getter, the placeholder is displayed until data is returned
 * by the async getter.
 *
 * Use the retry prop to force a new query of the data at any time after the first render.
 */
export default function SmartDeferredDataComponent<T>(props: SmartDeferredDataComponentProps<T>) {

  const [data, setData] = useState<T|null>(props.syncGetter());
  const [error, setError] = useState<any>(null);
  const isFirstRender = useFirstRender();
  const retry = props.retry ?? 0;

  if (!isFirstRender && retry > 0) {
    setData(props.syncGetter());
    setError(null);
  }


  useEffect(() => {
    // get the data asynchronously if it is not available yet
    if (data === null) {
      props.asyncGetter().then((data) => {
       setData(data);
      }).catch( (reason) => {
        setError(reason);
      });
    }
  },[data, props.asyncGetter]);


  if (error !== null) {
    const onError = props.onError ?? (() => null);
    const errorElement = onError(error);
    if (errorElement !== null) {
      return errorElement;
    }
  }

  if (data === null) {
    return props.placeholder;
  }
  return props.onData(data);

}