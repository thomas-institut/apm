import {useContext} from "react";
import {AppContext} from "@/ReactAPM/App";
import {useQuery} from "@tanstack/react-query";
import Skeleton from "@/ReactAPM/Components/Skeleton";
import {ApiUserTranscriptions} from "@/Api/DataSchema/ApiUserTranscriptions";
import EntityLink from "@/ReactAPM/Components/EntityLink";

interface TranscriptionsForUserProps {
  userId: number;
}

export default function TranscriptionsForUser(props: TranscriptionsForUserProps) {
  const {userId} = props;
  const appContext = useContext(AppContext);

  const getTranscriptionsForUser = (userId: number) => {
    return appContext.apiClient.userTranscriptions(userId);
  };

  const queryResult = useQuery({
    queryKey: ['transcriptions', userId], queryFn: () => getTranscriptionsForUser(userId),
  });

  if (queryResult.status === 'pending') {
    return (<Skeleton as="div" style={{width: '20em', height: '5em'}}></Skeleton>);
  }

  if (queryResult.status === 'error') {
    return (<div>Error: {queryResult.error.message}</div>);
  }


  const docData = getDocData(queryResult.data);

  console.log(docData);

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