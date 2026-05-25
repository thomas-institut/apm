import {Breadcrumb} from "react-bootstrap";
import {Link} from "react-router";
import {useContext} from "react";
import {ApeContext} from "@/App/App";


export function Info() {
  const context = useContext(ApeContext);
  const appConfig = context.appConfig;
  if (!appConfig) {
    return <></>;
  }

  return  <>
    <Breadcrumb>
      <Breadcrumb.Item linkAs={Link} linkProps={{to: "/"}}>Home</Breadcrumb.Item>
      <Breadcrumb.Item active>Info</Breadcrumb.Item>
    </Breadcrumb>
    <div>
      This is {appConfig.name}, {appConfig.version} ({appConfig.versionDate})
    </div>
  </>
}
