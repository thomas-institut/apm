import {createRoot} from "react-dom/client";
import React, {useEffect, useImperativeHandle, useRef, useState} from "react";
import {randomAlphaString} from "@/toolbox/ToolBox";
import {NiceToggle} from "@/widgets/NiceToggle";
import 'bootstrap5/dist/css/bootstrap.min.css';
import {Button, Container} from "react-bootstrap";
import OsdViewer from "@/ReactAPM/Components/OsdViewer";

const JsToReact = () => {

  const numToggles = 5;
  const toggleRefs = useRef<(NiceToggleMethods|null)[]>(Array.from({length: numToggles}, () => null));
  const [ numTogglesOn, setNumTogglesOn ] = useState<number>(5);

  const niceToggleRef = useRef<NiceToggleMethods|null>(null);


  const images = [
    'https://loremflickr.com/cache/resized/65535_54226753332_4eaa3fe5e0_b_1000_1000_nofilter.jpg',
    'https://loremflickr.com/cache/resized/65535_54151462946_aa622eb51d_h_1000_1000_nofilter.jpg',
    'https://loremflickr.com/cache/resized/65535_52753845660_aa219641f1_h_1000_1000_nofilter.jpg',
    'https://bilderberg.uni-koeln.de/BOOK-DARE-M-DE-MUC-BSB-Clm.465/1/jpg',
    'https://bilderberg.uni-koeln.de/BOOK-DARE-M-DE-MUC-BSB-Clm.465/25/jpg',
    'https://bilderberg.uni-koeln.de/BOOK-DARE-M-DE-MUC-BSB-Clm.465/40/DeepZoom'
  ];

  const [ imageUrl, setImageUrl ] = useState<string>(images[0]);
  const [imageLoadingStatus, setImageLoadingStatus] = useState<string>('');


  function handleToggle(toggleIndex: number, status: boolean) {
    console.log(`Toggle ${toggleIndex} is ${status ? 'on' : 'off'}`);
    setNumTogglesOn( (currentNum) => (status ? currentNum + 1 : currentNum - 1));
  }

  return (<Container>
      <h1>JS to React Conversion</h1>
      <p>This is a test page for converting JavaScript code to React components.</p>
      <div style={{display: 'flex', flexDirection: 'row', gap: '10px'}}>
        <div>A row of nice toggles ({numTogglesOn} are on)</div>
        { toggleRefs.current.map((_, i) => (
          <ReactNiceToggle key={i} onToggle={(status) => handleToggle(i, status)}/>
        ))}
      </div>
      <div style={{display: 'flex', flexDirection: 'row', gap: '2em'}}>
        <div>This is a nice toggle</div>
        <ReactNiceToggle ref={niceToggleRef}/>
        <Button size='sm' onClick={() => {niceToggleRef.current?.getToggleStatus() ? niceToggleRef.current?.toggleOff() : niceToggleRef.current?.toggleOn()}}>Toggle</Button>
      </div>

    <div style={{marginTop: '1em'}}>
      <div style={{display: 'flex', flexDirection: 'row', gap: '10px'}}>
        <div>Choose an image</div>
        { images.map((image, i) => (
          <Button key={i} onClick={() => {
            setImageLoadingStatus(`Loading...`);
            setImageUrl(image);
          }}>Image {i+1}</Button>
        ))}
        <div>{imageLoadingStatus}</div>
      </div>
    </div>

    <div style={{width: '500px', height: '500px', marginTop: '1em',border:'1px solid #dee2e6'}}>
      <OsdViewer url={imageUrl} onOpen={() => setImageLoadingStatus('')} isDeepZoom={imageUrl.includes('DeepZoom')}/>
    </div>
    </Container>);
};


interface NiceToggleMethods {
  toggleOn: () => void;
  toggleOff: () => void;
  getToggleStatus: () => boolean;
}

interface NiceToggleProps {
  toggleClass?: string;
  onToggle?: (status: boolean) => void;
  ref?: React.Ref<NiceToggleMethods|null>;
}
const ReactNiceToggle = (props: NiceToggleProps) => {
  const {toggleClass, onToggle} = props;
  const someClass = useRef(toggleClass ?? randomAlphaString(8));
  const containerRef = useRef(null);
  const niceToggleInstanceRef = useRef<NiceToggle|null>(null);

  const handleOnToggle = (ev: any) => {
    onToggle?.(ev.detail.toggleStatus);
  }

  useEffect(() => {
    if (containerRef.current && !niceToggleInstanceRef.current) {
      const toggle = new NiceToggle({
        containerSelector: `.${someClass.current}`,
      });
      toggle.on('toggle', handleOnToggle);
      niceToggleInstanceRef.current = toggle;
    }
  });

  useImperativeHandle(props.ref, () => ({
    toggleOn: () => {niceToggleInstanceRef.current?.toggleOn()},
    toggleOff: () => {niceToggleInstanceRef.current?.toggleOff()},
    getToggleStatus: () => {return niceToggleInstanceRef.current?.getToggleStatus() ?? false}
  }), []);

  return <div className={someClass.current} ref={containerRef}/>;
};
const root = createRoot(document.getElementById("app")!);
root.render(<JsToReact/>);



