import {Button, Modal} from "react-bootstrap";
import {ChangeEvent, Fragment, JSX, useState} from "react";
import {EntityNameTuple} from "@/Api/ApmApiClient";
import {useQuery} from "@tanstack/react-query";
import EntitySelect from "@/ReactAPM/Components/EntitySelect";
import {mapRecord} from "@/toolbox/mapRecordUtils";
import {InfoDiv, InfoDivType} from "@/ReactAPM/Components/InfoDiv";
import {Tid} from "@/Tid/Tid";


interface EntityCreationDialogProps {
  title: string;
  entityName: string;
  creationParameters: Record<string, CreationParameterDefinition>;
  show: boolean;
  size?: string;
  onCancel: () => void;
  creationSuccessMessage?: string;
  onCreationSuccess: (newId: number) => void;
  /**
   * Returns the id of the newly created entity or throws an error message if the creation failed.
   * @param params
   */
  entityCreationFunction: (values: Record<string, ParameterValue>) => Promise<number>;
}

interface CreationParameterCommon {
  label: string;
  type: 'string' | 'number' | 'entity',
}

interface CreationParameterString extends CreationParameterCommon {
  type: 'string';
  placeHolder?: string;
  defaultValue?: string;
  validationFunction?: ((value: string) => boolean) | 'RequireNonEmptyString';
}

interface CreationParameterNumber extends CreationParameterCommon {
  type: 'number';
  defaultValue?: number;
  validationFunction?: ((value: number) => boolean);
}

interface CreationParameterEntity extends CreationParameterCommon {
  type: 'entity';
  defaultEntity?: number;
  entityOptionsFetchFunction: () => Promise<EntityNameTuple[]>;
  validationFunction?: ((value: number) => boolean);
}

type CreationParameterDefinition = CreationParameterString | CreationParameterNumber | CreationParameterEntity;

interface ParameterValueCommon {
  type: 'string' | 'number' | 'entity';
}

interface ParameterValueString extends ParameterValueCommon {
  type: 'string';
  value: string;
}

interface ParameterValueNumber extends ParameterValueCommon {
  type: 'number';
  value: number;
}

interface ParameterValueEntity extends ParameterValueCommon {
  type: 'entity';
  value: number;
}

export type ParameterValue = ParameterValueString | ParameterValueNumber | ParameterValueEntity;

interface EntityParameterData {
  id: string;
  data: EntityNameTuple[];
}

export default function EntityCreationDialog(props: EntityCreationDialogProps) {
  const queryResult = useQuery({
    queryKey: ['entityParameterData', ...Object.keys(props.creationParameters)],
    queryFn: () => getEntityParameterData(props.creationParameters)
  });

  const getDefaultFormValues = (): Record<string, ParameterValue> => {
    const getDefaultValue = (param: CreationParameterDefinition, id: string): ParameterValue => {
      switch (param.type) {
        case 'string':
          return {type: 'string', value: param.defaultValue ?? ''};

        case 'number':
          return {type: 'number', value: param.defaultValue ?? 0};

        case 'entity':
          if (queryResult.status !== 'success') {
            return {type: 'entity', value: param.defaultEntity ?? -1};
          }
          const entityOptions = queryResult.data.find(d => d.id === id)?.data;
          if (entityOptions === undefined || entityOptions.length === 0) {
            return {type: 'entity', value: -1};
          }
          return {type: 'entity', value: param.defaultEntity ?? entityOptions[0][0]};
      }
    };
    return mapRecord(props.creationParameters, getDefaultValue);
  };

  const [infoDivType, setInfoDivType] = useState<InfoDivType>('info');
  const [infoDivText, setInfoDivText] = useState<string>('');
  const [createButtonEnabled, setCreateButtonEnable] = useState<boolean>(false);
  const [formValues, setFormValues] = useState<Record<string, ParameterValue>>(getDefaultFormValues());


  async function getEntityParameterData(paramDefs: Record<string, CreationParameterDefinition>): Promise<EntityParameterData[]> {
    const data: EntityParameterData[] = [];
    for (const id in paramDefs) {
      const paramDef = paramDefs[id];
      if (paramDef.type === 'entity') {
        const entityOptions = await paramDef.entityOptionsFetchFunction();
        data.push({id: id, data: entityOptions});
      }
    }
    return data;
  }


  function validateParams(): boolean {
    const paramIds = Object.keys(props.creationParameters);

    for (const id of paramIds) {
      const paramDef = props.creationParameters[id];
      switch (paramDef.type) {
        case 'string':
          const stringParamValue = formValues[id] as ParameterValueString;
          const stringValidationFunction = paramDef.validationFunction;
          if (stringValidationFunction !== undefined) {
            if (stringValidationFunction === 'RequireNonEmptyString') {
              if (!isNonEmptyString(stringParamValue.value as string)) {
                return false;
              }
            } else {
              if (!stringValidationFunction(stringParamValue.value)) {
                return false;
              }
            }
          }
          break;

        case 'number':
          const numberParamValue = formValues[id] as ParameterValueNumber;
          const numberValidationFunction = paramDef.validationFunction;
          if (numberValidationFunction !== undefined) {
            if (!numberValidationFunction(numberParamValue.value)) {
            }
          }
          break;

        case 'entity':
          const entityParamValue = formValues[id] as ParameterValueEntity;
          const entityValidationFunction = paramDef.validationFunction;
          if (entityValidationFunction !== undefined) {
            if (!entityValidationFunction(entityParamValue.value)) {
            }
          }
          break;
      }
    }
    return true;
  }

  const handleOChangeStringParam = (id: string, ev: ChangeEvent<HTMLInputElement>) => {
    const value = ev.target.value;
    setFormValues((prev) => ({
      ...prev, [id]: {id: id, type: 'string', value: value}
    }));
    setCreateButtonEnable(validateParams());
  };

  const handleOnChangeNumberParam = (id: string, ev: ChangeEvent<HTMLInputElement>) => {
    const value = ev.target.value;
    setFormValues((prev) => ({
      ...prev, [id]: {id: id, type: 'number', value: parseInt(value, 10)}
    }));
    setCreateButtonEnable(validateParams());
  };

  const handleOnChangeEntityParam = (id: string, selectedEntity: number) => {
    setFormValues((prev) => ({
      ...prev, [id]: {id: id, type: 'entity', value: selectedEntity}
    }));
    setCreateButtonEnable(validateParams());
  };

  function getInputForParameter(id: string, param: CreationParameterDefinition): JSX.Element | null {

    switch (param.type) {
      case 'string':
        return <input placeholder={param.placeHolder ?? ''} defaultValue={param.defaultValue ?? ''}
                      onChange={(ev) => handleOChangeStringParam(id, ev)}/>;

      case 'number':
        return <input type="text" defaultValue={param.defaultValue ?? 0}
                      onChange={(ev) => handleOnChangeNumberParam(id, ev)}/>;

      case 'entity':
        if (queryResult.status !== 'success') {
          return null;
        }
        const entityOptions = queryResult.data.find(d => d.id === id)?.data;
        if (entityOptions === undefined || entityOptions.length === 0) {
          return null;
        }
        const currentFormValue = formValues[id] as ParameterValueEntity;
        if (currentFormValue.value === -1) {
          setFormValues((prev) => ({
            ...prev, [id]: {type: 'entity', value: entityOptions[0][0]}
          }));
          return null;
        }
        return <EntitySelect entityTuples={entityOptions} selectedEntity={currentFormValue.value}
                             onChange={(entityId) => handleOnChangeEntityParam(id, entityId)}/>;
    }
  }

  const handleHide = () => {
    setCreateButtonEnable(false);
    setInfoDivText('');
    setFormValues(getDefaultFormValues());
    props.onCancel();
  };

  async function handleOnClickCreateButton() {
    setInfoDivText(`Creating new ${props.entityName}...`);
    setInfoDivType('info');
    try {
      const result = await props.entityCreationFunction(formValues);
      setInfoDivText(`New ${props.entityName} created with id ${Tid.toBase36String(result)}${props.creationSuccessMessage !== '' ? `. ${props.creationSuccessMessage}` : ''}`);
      setInfoDivType('success');
      setFormValues(getDefaultFormValues());
      setCreateButtonEnable(false);
      props.onCreationSuccess(result);
    } catch (e) {
      console.warn('Error creating entity', e);
      setInfoDivText(String(e));
      setInfoDivType('error');
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
        <span className={'text-danger'}>Error loading data</span>
      </Modal.Body>
    </Modal>;
  }


  return <Modal show={props.show} onHide={handleHide} size={props.size ?? 'lg'}>
    {modalHeader}
    <Modal.Body>
      <div style={{display: 'grid', gridTemplateColumns: '25% auto', rowGap: '1em'}}>
        {Object.keys(props.creationParameters).map(((id) => {
          const p = props.creationParameters[id];
          return <Fragment key={id}>
            <div>{p.label}</div>
            <div>{getInputForParameter(id, p)}</div>
          </Fragment>;
        }))}
      </div>
    </Modal.Body>
    <Modal.Footer>
      <InfoDiv type={infoDivType} text={infoDivText}/>
      <Button variant="danger" disabled={!createButtonEnabled}
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

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}