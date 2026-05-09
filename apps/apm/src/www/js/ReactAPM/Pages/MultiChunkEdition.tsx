import {useParams} from "react-router";


export default function MultiChunkEdition() {

  const {id} = useParams();

  return (
    <>
      <h1>Multi Chunk Edition {id}</h1>

      <p>
        The multi chunk edition with id {id} will be displayed here.
      </p>
    </>

  )
}