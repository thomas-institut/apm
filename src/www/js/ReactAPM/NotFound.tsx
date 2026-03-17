import {useContext} from "react";
import {AppContext} from "@/ReactAPM/App";
import {ApmUrlGenerator} from "@/ApmUrlGenerator";
import {Link, useLocation} from "react-router";


export default function NotFound() {
  document.title = 'Not Found';
  const appContext = useContext(AppContext);

  const baseUrl = appContext.reactAppBaseUrl;
  const urlGen = new ApmUrlGenerator(baseUrl);
  const location = useLocation();

  console.log(location);

  const logoUrl = urlGen.images() + '/apm-logo-plain.svg';

  return (<div style={{margin: '3em', display: 'flex', flexDirection: 'column', gap: '2em'}}>

    <div><Link to="/"><img src={logoUrl} alt="APM" height="100"/></Link></div>
    <div style={{fontSize: '1.5em'}}>Oops! The page you are looking for does not exist.</div>
    <div><Link to={'/'}>Return to the main page</Link></div>
  </div>)
}