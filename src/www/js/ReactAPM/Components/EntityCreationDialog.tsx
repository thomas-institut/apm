import {Button, Modal} from "react-bootstrap";
import {ChangeEvent, JSX, useRef, useState} from "react";
import {Tid} from "@/Tid/Tid";
import {EntityNameTuple} from "@/Api/ApmApiClient";
import {useQuery} from "@tanstack/react-query";
import EntitySelect from "@/ReactAPM/Components/EntitySelect";


interface EntityCreationDialogProps {
  title: string;
  creationParameters: CreationParameterDefinition[];
  show: boolean;
  size?: string;
  onCancel: () => void;
  onCreationSuccess: (newId: number) => void;
  /**
   * Returns the id of the newly created entity or an error message.
   * @param params
   */
  entityCreationFunction: (params: CreationParameterValue[]) => Promise<number|string>;
}

interface CreationParameterDefinition {
  id: string;
  label: string;
  type: 'string' | 'number' | 'entity',
  placeHolder?: string;
  defaultValue?: string | number;
  entityOptionsFetchFunction?: () => Promise<EntityNameTuple[]>;
  validationFunction?: ((value: string | number) => boolean) | 'RequireNonEmptyString';
}

export interface CreationParameterValue {
  id: string;
  value: string | number;
}

interface EntityParameterData {
  id: string;
  data: EntityNameTuple[];
}

export default function EntityCreationDialog(props: EntityCreationDialogProps) {

  const warningTextRef = useRef<HTMLDivElement | null>(null);
  const createButtonRef = useRef<HTMLButtonElement | null>(null);
  const [createButtonDisabled, setCreateButtonDisabled] = useState<boolean>(true);
  const paramsRef = useRef<CreationParameterValue[]>(props.creationParameters.map(p => {
    return {id: p.id, value: p.defaultValue ?? ''};
  }));

  async function getEntityParameterData(paramDefs: CreationParameterDefinition[]): Promise<EntityParameterData[]> {
    const data: EntityParameterData[] = [];
    for(let i = 0 ; i < paramDefs.length ; i++) {
      const paramDef = paramDefs[i];
      if (paramDef.entityOptionsFetchFunction !== undefined) {
        const entityOptions = await paramDef.entityOptionsFetchFunction();
        data.push({id: paramDef.id, data: entityOptions});
      }
    }
    return data;
  }

  const queryResult = useQuery({
    queryKey: ['entityParameterData', ...props.creationParameters.map(p => p.id)],
    queryFn: () => getEntityParameterData(props.creationParameters)
  });

  function validateParams(): boolean {
    for (const param of props.creationParameters) {
      const paramValue = paramsRef.current.find(p => p.id === param.id)?.value;
      if (paramValue === undefined) {
        console.error(`Cannot find parameter value for ${param.id}`);
        return false;
      }
      if (param.validationFunction !== undefined) {
        if (param.validationFunction === 'RequireNonEmptyString') {
          if (!isNonEmptyString(paramValue)) {
            return false;
          }
        } else {
          if (!param.validationFunction(paramValue)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  function onChangeParam(id: string, actualValue: string|number|null, ev: ChangeEvent<HTMLInputElement>|null = null) {
    const value = actualValue ?? ev?.target.value;
    if (value === undefined ) {
      console.error(`Value for ${id} is undefined`);
      return;
    }
    const params = paramsRef.current;
    const paramIndex = props.creationParameters.findIndex(p => p.id === id);
    if (paramIndex === -1) {
      console.error(`Cannot find parameter with id ${id}`);
      return;
    }
    const paramDef = props.creationParameters[paramIndex];
    let paramValue: number | string = value;
    if (paramDef.type === 'number' || paramDef.type === 'entity') {
      paramValue = typeof value === 'number' ? value : parseInt(value);
    }
    params[paramIndex].value = paramValue;
    setCreateButtonDisabled(!validateParams());
  }

  function getInputForParameter(param: CreationParameterDefinition): JSX.Element {
    const stringAndNumberOnChangeFn = (ev: ChangeEvent<HTMLInputElement>) => onChangeParam(param.id, null, ev);
    const entityOnChangeFn = (entityId: number) => onChangeParam(param.id, entityId);
    switch (param.type) {
      case 'string':
        return <input type="text" placeholder={param.placeHolder ?? ''} defaultValue={param.defaultValue ?? ''}
                      onChange={stringAndNumberOnChangeFn}/>;

      case 'number':
        return <input type="text" placeholder={param.placeHolder ?? ''} defaultValue={param.defaultValue ?? ''}
                      onChange={stringAndNumberOnChangeFn}/>;

      case 'entity':
        if (queryResult.status !== 'success') {
          return <></>
        }
        const entityOptions = queryResult.data.find(d => d.id === param.id)?.data;
        if (entityOptions === undefined) {
          return <></>
        }
        let defaultEntity = entityOptions[0][0];
        if (param.defaultValue !== undefined && typeof param.defaultValue === 'number') {
          defaultEntity = param.defaultValue;
        }
        return <EntitySelect entityTuples={entityOptions} selectedEntity={defaultEntity} onChange={entityOnChangeFn}/>
    }
  }

  const handleHide = () => {
    setCreateButtonDisabled(true);
    props.onCancel();
  };

  async function handleOnClickCreateButton() {
    warningTextRef.current!.innerHTML = 'Creating document...';
    try {
      const result = await props.entityCreationFunction(paramsRef.current);
      console.log('Entity creation function returned', result);
      if (typeof result === 'string') {
        // error message
        warningTextRef.current!.innerHTML = result === '' ? 'Entity creation failed' : result;
      } else {
        warningTextRef.current!.innerHTML = `Entity created with id ${Tid.toBase36String(result)}...`;
        props.onCreationSuccess(result);
      }
    } catch (e) {
      console.warn('Error creating entity', e);
      warningTextRef.current!.innerHTML = 'Entity creation failed';
    }

  }


  const modalHeader = <Modal.Header closeButton>
    <Modal.Title>{props.title}</Modal.Title>
  </Modal.Header>;

  const modalFooter = <Modal.Footer>
    <Button variant="secondary" onClick={handleHide}>
      Close
    </Button>
    <Button variant="primary" disabled={true}>
      Create
    </Button>
  </Modal.Footer>;

  if (queryResult.status === 'pending') {
    return <Modal show={props.show} onHide={handleHide}>
      {modalHeader}
      <Modal.Body>
        <span className={'text-info'}>Loading data...</span>
      </Modal.Body>
      {modalFooter}
    </Modal>;
  }

  if (queryResult.status === 'error') {
    console.warn('Error loading data', queryResult.error);
    return <Modal show={props.show} onHide={handleHide}>
      {modalHeader}
      <Modal.Body>
        <span className={'text-danger'}>Error loading author/work data</span>
      </Modal.Body>
    </Modal>;
  }


  return <Modal show={props.show} onHide={handleHide} size={props.size ?? 'lg'}>
    {modalHeader}
    <Modal.Body>
      <div style={{display: 'grid', gridTemplateColumns: '25% auto', rowGap: '1em'}}>

        {props.creationParameters.map(p => {
          return <>
            <div key={'label' + p.id}>{p.label}</div>
            <div key={'input' + p.id}>{getInputForParameter(p)}</div>
          </>;
        })}
      </div>
    </Modal.Body>
    <Modal.Footer>
      <div ref={warningTextRef} className={'text-secondary'}></div>
      <Button variant="danger" ref={createButtonRef} disabled={createButtonDisabled}
              onClick={handleOnClickCreateButton}>
        Create
      </Button>
      <Button variant="secondary" onClick={handleHide}>
        Cancel
      </Button>
    </Modal.Footer>
  </Modal>;

}

// Standard validation functions

function isNonEmptyString(value: number|string) : boolean {
  return typeof value === 'string' ? value.trim().length > 0 : false;
}