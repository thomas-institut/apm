import {useParams} from "react-router";


export default function Person() {

  const {id} = useParams();

  return (
    <>
      <h1>Person {id}</h1>

      <p>
        Person {id} will be displayed here.
      </p>
    </>

  )
}