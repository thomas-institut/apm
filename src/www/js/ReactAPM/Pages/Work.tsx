import {useParams} from "react-router";


export default function Work() {

  const {workId} = useParams();

  return (
    <>
      <h1>Work {workId}</h1>

      <p>
        Work id {workId} will be displayed here.
      </p>
    </>

  )
}