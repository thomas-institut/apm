import type {ApiUserTranscriptions} from "@/Api/DataSchema/ApiUserTranscriptions";
import EntityLink from "@/ReactAPM/Components/EntityLink";

interface TranscriptionsForUserProps {
  data: ApiUserTranscriptions;
}

export default function TranscriptionsForUser(props: TranscriptionsForUserProps) {
  const data = props.data;

  const docData = getDocData(data);
  return docData.map((doc) => {
    return (
      <div key={doc.id} style={{marginBottom: '1em'}}>
        <p className="dashboard-list-item"><EntityLink type="document" id={doc.id} name={doc.title}/></p>
        <p className="dashboard-list-item-2">
          {doc.pages.map((page) => {
            return (
              <span key={page.pageNumber}>
                <EntityLink type="docPage" id={page.docId} secondaryId={page.pageNumber} name={page.foliation}/> &nbsp;
              </span>
            )
          })}
        </p>

      </div>
    )
  })

}

interface PageData {
  docId: number;
  pageNumber: number;
  foliation: string;
}

interface DocData {
  oldId: number;
  id: number;
  title: string;
  pages: PageData[];
}

function getDocData(data: ApiUserTranscriptions): DocData[] {
  return Object.keys(data.docInfoArray).map((docKey): DocData => {
    const docIndex = parseInt(docKey);
    const docInfo = data.docInfoArray[docIndex];
    return {
      oldId: docIndex, id: docInfo.id, title: docInfo.title, pages: getPagesForDoc(docIndex, data)
    };
  }).sort((a, b) => a.title.localeCompare(b.title));
}

function getPagesForDoc(docId: number, data: ApiUserTranscriptions): PageData[] {
  return data.pageInfoArray.filter((pageInfo) => pageInfo.docId === docId).map((pageInfo): PageData => {
    return {
      docId: data.docInfoArray[pageInfo.docId].id,
      pageNumber: pageInfo.sequence,
      foliation: pageInfo.foliationIsSet ? pageInfo.foliation : pageInfo.sequence.toString(),
    };
  });

}