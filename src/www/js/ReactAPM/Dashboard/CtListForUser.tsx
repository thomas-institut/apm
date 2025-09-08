import {RefObject, useContext} from "react";
import {AppContext} from "@/ReactAPM/App";
import {urlGen} from "@/pages/common/SiteUrlGen";
import {useQuery} from "@tanstack/react-query";
import {Spinner} from "react-bootstrap";

interface CtListForUserProps {
  userId: number;
  edRef: RefObject<any>,
  ctRef: RefObject<any>,
}

export default function CtListForUser(props: CtListForUserProps) {
  const {userId} = props;
  const appContext = useContext(AppContext);

  const getCtListForUser = (userId: number) => {
    return appContext.dataProxy.get(urlGen.apiUserGetCollationTableInfo(userId), false, 60);
  };

  const getListItemsForArray = (array: any[]) => {
    return array.map((item: any) => {
      return <p key={item.id}>{item.chunkId}: {item.title}</p>;
    });
  };

  const {isLoading, isError, data, error} = useQuery({
    queryKey: ['ctList', userId], queryFn: () => getCtListForUser(userId),
  });

  if (isLoading) {
    return (<Spinner animation="border" role="status"></Spinner>);
  }

  if (isError) {
    return (<div>Error: {error.message}</div>);
  }

  const editions = data['tableInfo'].filter((item: any) => item.type === 'edition');
  const ctTables = data['tableInfo'].filter((item: any) => item.type === 'ctable');


  return (<>
    <h1 ref={props.edRef}>Editions</h1>


      {getListItemsForArray(editions)}


    <h1 ref={props.ctRef}>Collation Tables</h1>

      {getListItemsForArray(ctTables)}

  </>);

}