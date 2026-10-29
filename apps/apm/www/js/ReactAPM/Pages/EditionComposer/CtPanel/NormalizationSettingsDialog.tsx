import {useEffect, useState} from 'react';
import {Button, Form, Modal} from 'react-bootstrap';
import {NormalizerRegister} from '@/pages/common/NormalizerRegister';

interface NormalizerMetadata {
  label?: string;
  help?: string;
}

export interface NormalizationSettingsDialogProps {
  show: boolean;
  normalizerNames: string[];
  selectedNormalizers: string[];
  normalizerRegister: NormalizerRegister;
  onHide: () => void;
  onApply: (normalizers: string[]) => void;
}

export default function NormalizationSettingsDialog(props: NormalizationSettingsDialogProps) {
  const [selectedNormalizers, setSelectedNormalizers] = useState<string[]>(props.selectedNormalizers);

  useEffect(() => {
    if (props.show) {
      setSelectedNormalizers([...props.selectedNormalizers]);
    }
  }, [props.selectedNormalizers, props.show]);

  const toggleNormalizer = (name: string, selected: boolean) => {
    setSelectedNormalizers((current) => selected
      ? [...current.filter((normalizer) => normalizer !== name), name]
      : current.filter((normalizer) => normalizer !== name));
  };

  return <Modal show={props.show} onHide={props.onHide} backdrop="static" keyboard={false}>
    <Modal.Header closeButton>
      <Modal.Title>Automatic normalization settings</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <p>Select the normalizations to apply to the collation table.</p>
      <Form className="ct-normalization-settings">
        {props.normalizerNames.map((name) => {
          const metadata = props.normalizerRegister.getNormalizerMetadata(name) as NormalizerMetadata;
          return <div className="ct-normalization-option" key={name}>
            <Form.Check type="checkbox" id={`ct-normalizer-${name}`} checked={selectedNormalizers.includes(name)}
                        label={metadata.label ?? name}
                        onChange={(event) => toggleNormalizer(name, event.target.checked)}/>
            {metadata.help !== undefined && <div className="ct-normalizer-help" dangerouslySetInnerHTML={{__html: metadata.help}}/>}
          </div>;
        })}
      </Form>
      {selectedNormalizers.length === 0 && <p className="ct-no-normalizers-selected">No normalizations selected; applying will turn normalizations off.</p>}
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={props.onHide}>Cancel</Button>
      <Button variant="primary" onClick={() => props.onApply(selectedNormalizers)}>Apply</Button>
    </Modal.Footer>
  </Modal>;
}