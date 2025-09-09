
import {AppContext} from "../App";
import {useContext} from "react";
import {urlGen} from "@/pages/common/SiteUrlGen";
import {useQuery} from "@tanstack/react-query";
import {Spinner} from "react-bootstrap";

interface MceListForUserProps {
  userId: number;
  itemClassName?: string;
}

export default function MceListForUser(props: MceListForUserProps) {
  const {userId} = props;
  const appContext  = useContext(AppContext);

  const getMceListForUser = (userId: number) => {
    return appContext.dataProxy.get(urlGen.apiUserGetMultiChunkEditionInfo(userId), false, 60);
  }

  const { isLoading, isError, data, error} = useQuery({
    queryKey: ['mceList', userId],
    queryFn: () => getMceListForUser(userId),
  });

  if (isLoading) {
    return (<Spinner animation="border" role="status"></Spinner>)
  }

  if (isError) {
    return (<div>Error: {error.message}</div>)
  }
  const items = data.map((item:any) => {
    return <p key={item.id} className={props.itemClassName}>
      {item.title}
    </p>
  })
  return <>
    {items}
  </>
}