import {useParams} from "react-router";
import './EditionComposer.css';
import {StatusPage} from "@/ReactAPM/Pages/MceComposer/StatusPage";
import {useContext, useEffect, useState} from "react";
import {Spinner} from "react-bootstrap";
import {AppContext} from "@/ReactAPM/App";
import {CtDataInterface} from "@/CtData/CtDataInterface";
import {CtVersionInfo} from "@/Api/DataSchema/ApiCollationTable";
import {panelsFromSpecs, PanelSpec} from "@/ReactAPM/Components/PanelUI/PanelSpec";
import MainTextPanel from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextPanel";
import AdminPanel from "@/ReactAPM/Pages/EditionComposer/AdminPanel/AdminPanel";
import ApmLogo from "@/ReactAPM/Components/ApmLogo/ApmLogo";
import EditableTextField from "@/ReactAPM/Components/EditableTextField";
import SplitPanels from "@/ReactAPM/Components/PanelUI/SplitPanels";
import TabPanel from "@/ReactAPM/Components/PanelUI/TabPanel";
import CtPanel from "@/ReactAPM/Pages/EditionComposer/CtPanel/CtPanel";


type ComposerStatus = 'start' | 'loading' | 'error' | 'loaded';


export default function EditionComposer() {

  const {id, version} = useParams();
  const [composerStatus, setComposerStatus] = useState<ComposerStatus>('start');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [ctData, setCtData] = useState<CtDataInterface | null>(null);
  const [versions, setVersions] = useState<CtVersionInfo[]>([]);
  const [isLatestVersion, setIsLatestVersion] = useState<boolean | null>(null);
  const [versionId, setVersionId] = useState(-1);
  const [versionTimeStamp, setVersionTimeStamp] = useState('');
  const [expandedTab, setExpandedTab] = useState<string | null>(null);
  const [activeTabPanelOne, setActiveTabPanelOne] = useState('mainText');
  const [activeTabPanelTwo, setActiveTabPanelTwo] = useState('admin');

  const appContext = useContext(AppContext);
  const shimWidth = 5;

  const getEditionData = async () => {
    if (!id) {
      setErrorMsg('Edition ID is missing');
      setComposerStatus('error');
      return null;
    }
    const tableId = parseInt(id);
    if (isNaN(tableId)) {
      setErrorMsg('Edition ID is not a number');
      setComposerStatus('error');
      return null;
    }
    if (tableId < 0) {
      setErrorMsg('Edition ID must be a positive number');
      setComposerStatus('error');
      return null;
    }
    try {
      return await appContext.apiClient.getSingleChunkData(tableId, version ?? '');

    } catch (error) {
      setErrorMsg('Failed to load edition data');
      setComposerStatus('error');
    }
  };


  useEffect(() => {
    if (composerStatus === 'start') {
      setComposerStatus('loading');
      return;
    }
    if (composerStatus === 'loading') {
      getEditionData().then((result) => {
        if (!result) {
          return;
        }
        setCtData(result.ctData);
        setVersions(result.versions);
        setIsLatestVersion(result.isLatestVersion);
        setVersionId(result.versionId);
        setVersionTimeStamp(result.timeStamp);
        setComposerStatus('loaded');
      });
      return;
    }

  }, [composerStatus]);


  if (composerStatus === 'error') {
    return <StatusPage label={'Error'}>
      <h2>Oops!</h2>
      <p className={'text-danger'}>{errorMsg}</p>
      <p>This may be a bug, please report it.</p>
    </StatusPage>;
  }

  if (composerStatus === 'loading') {
    return <StatusPage label={'Single Chunk Edition'}>Loading single chunk edition {id}...<Spinner
      size="sm"/></StatusPage>;
  }

  if (composerStatus === 'start') {
    return <StatusPage label={'Single Chunk Edition'}>Starting...</StatusPage>;
  }

  if (ctData === null) {
    setErrorMsg('CtData is null after loading, this is certainly a bug, please report it.');
    return <h1>Bug!!</h1>;
  }

  const notificationsDiv = <div>
    {!isLatestVersion && <p className={'text-danger'}>This is not the latest version</p>}
  </div>;


  const panelSpecs: PanelSpec[] = [
    {
      panel: 'one',
      key: 'mainText',
      title: 'Main Text',
      content: <MainTextPanel ctData={ctData}/>
    },
    {
      panel: 'one',
      key: 'cTable',
      title: 'Collation',
      content: <CtPanel ctData={ctData}/>
    },
    {
      panel: 'two',
      key: 'admin',
      title: 'Admin',
      content: <AdminPanel tableId={ctData.tableId} versionId={versionId} versions={versions}
                           isLatestVersion={isLatestVersion ?? false}/>
    }
  ];

  return (<div className="ec-composer">
    <div className="header">
      <ApmLogo height={30} className={'logo'}/>
      <EditableTextField className={'title'} editingClassName={'title editing'} text={ctData.title}
                         onConfirm={() => {
                           console.log('title edited');
                         }}/>
      {notificationsDiv}
    </div>
    <SplitPanels direction={'vertical'} className="panelContainer" dividerClass="divider"
                 dividerWidth={3}
                 outerMargin={10}>
      <TabPanel activeTabKey={activeTabPanelOne}
                onClickTab={(tabKey) => setActiveTabPanelOne(tabKey)}
        // onClickExpand={handleOnClickTabExpand}
                shimWidth={shimWidth}>
        {panelsFromSpecs(panelSpecs, 'one')}
      </TabPanel>
      <TabPanel activeTabKey={activeTabPanelTwo}
                onClickTab={(tabKey) => setActiveTabPanelTwo(tabKey)}
        // onClickExpand={handleOnClickTabExpand}
                shimWidth={shimWidth}>
        {panelsFromSpecs(panelSpecs, 'two')}
      </TabPanel>
    </SplitPanels>
  </div>);
}