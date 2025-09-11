import {useParams} from "react-router";


export default function Chunk() {

  const {workId, chunkId} = useParams();

  return (
    <>
      <h1>Work {workId}, chunk {chunkId}</h1>

      <p>
        Chunk will be displayed here.
      </p>
    </>

  )
}