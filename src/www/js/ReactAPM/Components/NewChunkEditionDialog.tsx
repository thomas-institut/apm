import {Button, Modal} from "react-bootstrap";
import {useContext, useRef, useState} from "react";
import {AppContext} from "@/ReactAPM/App";
import {ApiPersonWorksWorkData} from "@/Api/DataSchema/ApiPerson";
import {useQuery} from "@tanstack/react-query";
import {TranscriptionLanguages} from "@/constants/TranscriptionLanguages";


export interface NewChunkEditionParams {
  workId: string;
  chunkNumber: number;
  language: string;
}

interface NewChunkEditionDialogProps {
  show: boolean;
  onClickCreate: (params: NewChunkEditionParams) => Promise<void>;
  onHide: () => void;
}

interface AuthorData {
  id: number;
  name: string;
  works: ApiPersonWorksWorkData[];
}


export function NewChunkEditionDialog(props: NewChunkEditionDialogProps) {

  const context = useContext(AppContext);

  const authorSelectRef = useRef<HTMLSelectElement | null>(null);
  const workSelectRef = useRef<HTMLSelectElement | null>(null);
  const chunkNumberInputRef = useRef<HTMLInputElement | null>(null);
  const languageSelectRef = useRef<HTMLSelectElement | null>(null);
  const warningTextRef = useRef<HTMLDivElement | null>(null);
  const createButtonRef = useRef<HTMLButtonElement | null>(null);

  const [currentAuthorId, setCurrentAuthorId] = useState<number>(-1);
  const [createButtonDisabled, setCreateButtonDisabled] = useState<boolean>(true);


  async function getData(): Promise<AuthorData[]> {
    const authors = await context.apiClient.getAuthors();
    const data: AuthorData[] = [];
    for (let i = 0; i < authors.length; i++) {
      const personData = await context.apiClient.getPersonEssentialData(authors[i]);
      const worksResponse = await context.apiClient.getPersonWorks(authors[i]);
      data.push({id: authors[i], name: personData.name, works: worksResponse.works});
    }
    return data;
  }

  const queryResult = useQuery({queryKey: ['authorsWorkData'], queryFn: () => getData()});

  const modalHeader = <Modal.Header closeButton>
    <Modal.Title>New Chunk Edition</Modal.Title>
  </Modal.Header>;

  const modalFooter = <Modal.Footer>
    <Button variant="secondary" onClick={() => props.onHide()}>
      Close
    </Button>
    <Button variant="primary" disabled={true}>
      Create
    </Button>
  </Modal.Footer>;

  if (queryResult.status === 'pending') {
    return <Modal show={props.show} onHide={props.onHide}>
      {modalHeader}
      <Modal.Body>
        <span className={'text-info'}>Loading author/work data...</span>
      </Modal.Body>
      {modalFooter}
    </Modal>;
  }

  if (queryResult.status === 'error') {
    console.warn('Error loading author/work data', queryResult.error);
    return <Modal show={props.show} onHide={props.onHide}>
      {modalHeader}
      <Modal.Body>
        <span className={'text-danger'}>Error loading author/work data</span>
      </Modal.Body>
    </Modal>;
  }
  const authorData = queryResult.data;

  function getWorkSelectOptions(authorId: number) {
    if (authorId === -1) {
      return null;
    }
    const currentAuthorData = authorData.find(d => d.id === authorId);
    if (currentAuthorData === undefined) {
      return <option value={-1}>Error: cannot find author data</option>;
    }

    return currentAuthorData.works.map(w => <option value={w.workId}
                                                    key={w.entityId}>{w.workId}: {w.title.substring(0, 48)}</option>);
  }

  function validateParams(): boolean {
    const params = getParams();
    let allGood = true;
    if (params.workId === '') {
      allGood = false;
    }
    if (params.chunkNumber < 1) {
      allGood = false;
    }
    if (params.language === '') {
      allGood = false;
    }
    setCreateButtonDisabled(!allGood);
    return allGood;
  }

  function getParams(): NewChunkEditionParams {
    return {
      workId: workSelectRef.current!.value,
      chunkNumber: parseInt(chunkNumberInputRef.current!.value),
      language: languageSelectRef.current!.value
    };
  }

  function handleOnClickCreateButton() {

    const params = getParams();
    console.log(`Creating edition`, params);
    warningTextRef.current!.innerHTML = 'Creating edition...';
    props.onClickCreate(params).then(() => {
      console.log('Done');
    });
  }

  function handleHide() {
    setCreateButtonDisabled(true)
    props.onHide();
  }

  return <Modal show={props.show} onHide={handleHide} size={'lg'}>
    <Modal.Header closeButton>
      <Modal.Title>New Chunk Edition</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <div style={{display: 'grid', gridTemplateColumns: '25% auto', rowGap: '1em'}}>

        <div>Author:</div>
        <select ref={authorSelectRef}
                onChange={(ev) => {
                  validateParams();
                  setCurrentAuthorId(parseInt(ev.target.value));
                }}>
          <option value={-1}>1. Select an author</option>
          {authorData.map(d => <option value={d.id} key={d.id}>{d.name}</option>)}
        </select>

        <div>Work:</div>
        <select ref={workSelectRef} onChange={() => validateParams()} defaultValue={''}>
          <option value={''}>2. Select a work</option>
          {getWorkSelectOptions(currentAuthorId)}
        </select>

        <div>Chunk number:</div>
        <input ref={chunkNumberInputRef} type="number" placeholder={'3. Enter a chunk number'}
               onChange={() => validateParams()}/>


        <div>Language:</div>
        <select ref={languageSelectRef} defaultValue={''} onChange={() => validateParams()}>
          <option value={''}>4. Select a language</option>
          {TranscriptionLanguages.map(l => <option value={l.code}
                                                   key={l.id}>{l.name}</option>)}
        </select>
      </div>
    </Modal.Body>
    <Modal.Footer>
      <div ref={warningTextRef} className={'text-secondary'}></div>
      <Button variant="danger" ref={createButtonRef} disabled={createButtonDisabled} onClick={handleOnClickCreateButton}>
        Create
      </Button>
      <Button variant="secondary" onClick={handleHide}>
        Cancel
      </Button>
    </Modal.Footer>
  </Modal>;

}