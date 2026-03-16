import {Button, Modal} from "react-bootstrap";
import {useContext, useRef, useState} from "react";
import {AppContext} from "@/ReactAPM/App";
import {useQuery} from "@tanstack/react-query";
import {EntityNameTuple} from "@/Api/ApmApiClient";
import {trimWhiteSpace} from "@/toolbox/Util";
import EntitySelect from "@/ReactAPM/Components/EntitySelect";
import {Tid} from "@/Tid/Tid";

export interface NewDocumentParams {
  title: string;
  type: number;
  lang: number;
  imageSource: number;
  imageSourceData: string;
}

interface NewDocumentDialogProps {
  show: boolean;
  onCreateSuccess: (newDocId: number) => void;
  onClickHide: () => void;
}

interface RequiredSystemData {
  languages: EntityNameTuple[];
  docTypes: EntityNameTuple[];
  imageSources: EntityNameTuple[];
}

export function NewDocumentDialog(props: NewDocumentDialogProps) {

  const context = useContext(AppContext);

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const languageSelectRef = useRef<HTMLSelectElement | null>(null);
  const docTypeSelectRef = useRef<HTMLSelectElement | null>(null);
  const imageSourceSelectRef = useRef<HTMLSelectElement | null>(null);
  const imageSourceDataInputRef = useRef<HTMLInputElement | null>(null);
  const warningTextRef = useRef<HTMLDivElement | null>(null);
  const createButtonRef = useRef<HTMLButtonElement | null>(null);
  const [createButtonDisabled, setCreateButtonDisabled] = useState<boolean>(true);


  async function getData() {
    const data: RequiredSystemData = {languages: [], docTypes: [], imageSources: []};
    data.languages = await context.apiClient.getAvailableLanguages();
    data.docTypes = await context.apiClient.getAvailableDocumentTypes();
    data.imageSources = await context.apiClient.getAvailableImagesSources();
    return data;
  }

  const queryResult = useQuery({queryKey: ['newDocumentDialogData'], queryFn: () => getData()});

  const modalHeader = <Modal.Header closeButton>
    <Modal.Title>New Document</Modal.Title>
  </Modal.Header>;

  const modalFooter = <Modal.Footer>
    <Button variant="secondary" onClick={() => props.onClickHide()}>
      Close
    </Button>
    <Button variant="primary" disabled={true}>
      Create
    </Button>
  </Modal.Footer>;

  if (queryResult.status === 'pending') {
    return <Modal show={props.show} onHide={props.onClickHide}>
      {modalHeader}
      <Modal.Body>
        <span className={'text-info'}>Loading data...</span>
      </Modal.Body>
      {modalFooter}
    </Modal>;
  }

  if (queryResult.status === 'error') {
    console.warn('Error loading data', queryResult.error);
    return <Modal show={props.show} onHide={props.onClickHide}>
      {modalHeader}
      <Modal.Body>
        <span className={'text-danger'}>Error loading author/work data</span>
      </Modal.Body>
    </Modal>;
  }
  const data = queryResult.data;

  function getParams(): NewDocumentParams {
    return {
      title: trimWhiteSpace(titleInputRef.current?.value ?? ''),
      lang: parseInt(languageSelectRef.current?.value ?? ''),
      type: parseInt(docTypeSelectRef.current?.value ?? ''),
      imageSource: parseInt(imageSourceSelectRef.current?.value ?? ''),
      imageSourceData: trimWhiteSpace(imageSourceDataInputRef.current?.value ?? '')
    };
  }

  function validateParams(): boolean {
    const params = getParams();
    let allGood = true;
    if (params.title === '') {
      allGood = false;
    }
    if (params.imageSourceData === '') {
      allGood = false;
    }

    if (params.lang === 0) {
      allGood = false;
    }
    if (params.imageSource === 0) {
      allGood = false;
    }
    if (params.type === 0) {
      allGood = false;
    }
    setCreateButtonDisabled(!allGood);
    return allGood;
  }


  async function handleOnClickCreateButton() {
    const params = getParams();
    console.log(`Creating document`, params);
    warningTextRef.current!.innerHTML = 'Creating document...';
    try {
      const newId = await context.apiClient.createDocument(params.title, params.type, params.lang, params.imageSource, params.imageSourceData);
      console.log('Document created', newId);
      warningTextRef.current!.innerHTML = `Document created with id ${Tid.toBase36String(newId)}, loading...`;
      props.onCreateSuccess(newId);
    } catch (error) {
      console.error('Error creating document', error);
      warningTextRef.current!.innerHTML = 'Error creating document';
      return;
    }
  }

  function handleHide() {
    setCreateButtonDisabled(true);
    props.onClickHide();
  }

  return <Modal show={props.show} onHide={handleHide} size={'lg'}>
    <Modal.Header closeButton>
      <Modal.Title>New Document</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <div style={{display: 'grid', gridTemplateColumns: '25% auto', rowGap: '1em'}}>

        <div>Title:</div>
        <input ref={titleInputRef} type="text" placeholder={'Enter a title'} onChange={() => validateParams()}/>

        <div>Language:</div>
        <EntitySelect entityTuples={data.languages} selectedEntity={data.languages[0][0]} ref={languageSelectRef}
                      onChange={() => validateParams()}/>

        <div>Document type:</div>
        <EntitySelect entityTuples={data.docTypes} selectedEntity={data.docTypes[0][0]} ref={docTypeSelectRef}
                      onChange={() => validateParams()}/>

        <div>Images Source:</div>
        <EntitySelect entityTuples={data.imageSources} selectedEntity={data.imageSources[0][0]}
                      ref={imageSourceSelectRef} onChange={() => validateParams()}/>

        <div>Image Source Data:</div>
        <input ref={imageSourceDataInputRef} type="text" placeholder={'Enter image source data'}
               onChange={() => validateParams()}/>
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