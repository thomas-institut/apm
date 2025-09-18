import {useParams} from "react-router";


export default function Document() {

  const {id} = useParams();

  return (
    <>
      <h1>Document {id}</h1>

      <p>
        Document {id} will be displayed here.
      </p>
    </>

  )
}