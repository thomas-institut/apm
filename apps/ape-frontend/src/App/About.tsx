import {Breadcrumb} from "react-bootstrap";
import {Link} from "react-router";
import {useContext} from "react";
import {ApeContext} from "@/App/App";


export function About() {
  const context = useContext(ApeContext);
  const appConfig = context.appConfig;
  if (!appConfig) {
    return <></>;
  }

  return  <>
    <Breadcrumb>
      <Breadcrumb.Item linkAs={Link} linkProps={{to: "/"}}>Home</Breadcrumb.Item>
      <Breadcrumb.Item active>About</Breadcrumb.Item>
    </Breadcrumb>
    <div>
      <h1>About</h1>
      <p>
      This is {appConfig.name}, powered by APE version {appConfig.version} ({appConfig.versionDate})
      </p>
    </div>
  </>
}
