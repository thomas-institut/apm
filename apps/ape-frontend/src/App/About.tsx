import {useContext} from "react";
import {ApeContext} from "@/App/App";
import PageLayout from "@/ui/ApeUx/PageLayout";


export function About() {
  const context = useContext(ApeContext);
  const appConfig = context.appConfig;

  const appShortName = context.appConfig?.shortName ?? 'APE';

  document.title = `${appShortName}: About`;
  if (!appConfig) {
    return <></>;
  }

  return <PageLayout>
    <h1>About</h1>
    <p>This is {appConfig.name}, powered by APE version {appConfig.version} ({appConfig.versionDate})</p>
  </PageLayout>;
}
