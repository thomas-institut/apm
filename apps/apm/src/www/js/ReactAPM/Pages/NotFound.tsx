import NormalPageContainer from "@/ReactAPM/NormalPageContainer";


export default function NotFound() {

  return( <NormalPageContainer>
    <h1>Not Found</h1>
    <p className='text-danger'>
      The page you are looking for does not exist.
    </p>
  </NormalPageContainer>)

}