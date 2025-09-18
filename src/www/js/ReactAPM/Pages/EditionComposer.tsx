import {useParams} from "react-router";


export default function EditionComposer() {

  const {id} = useParams();

  return (
    <>
      <h1>Collation Table / Edition {id}</h1>

      <p>
        The collation table / edition with id {id} will be displayed here.
      </p>
    </>

  )
}