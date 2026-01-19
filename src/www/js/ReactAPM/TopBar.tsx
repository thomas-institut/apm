import {tr} from "@/pages/common/SiteLang";
import {CSSProperties, ReactNode, useContext} from "react";
import {Container, Nav, Navbar, NavDropdown} from "react-bootstrap";

import {NavLink, useLocation, useNavigate} from "react-router";
import {AppContext} from "./App";
import {PersonCircle} from "react-bootstrap-icons";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import {Tid} from "@/Tid/Tid";
import {ApmUrlGenerator} from "@/ApmUrlGenerator";

interface TopBarProps {
  style?: CSSProperties;
  onLogout: () => void;
}

function UserIcon(props: { name: string }) {
  return (<span>
    <PersonCircle/>&nbsp; {props.name}
    </span>);
}

/*
 * APM's Standard Top Bar
 *
 */
export default function TopBar(props: TopBarProps): ReactNode {

  const appContext = useContext(AppContext);
  // const showLanguageSelector = context.showLanguageSelector ?? false;
  // const siteLanguage = context.siteLanguage ?? 'en';

  const userId = appContext.userId;
  const userName = appContext.userName;
  const baseUrl = appContext.reactAppBaseUrl;
  const urlGen = new ApmUrlGenerator(baseUrl);
  const navigate = useNavigate();

  interface RoutedNavLinkProps {
    route: string;
    title: string;
    marginRight?: string;
  }

  function MyNav(props: RoutedNavLinkProps) {
    const route = props.route;
    const title = props.title;
    const location = useLocation();
    const currentStyle = {color: "rgb(40,40,40)", fontWeight: "bold"};
    const notCurrentStyle = {};

    const isCurrent = location.pathname === route;

    return (<Nav.Item style={{marginRight: props.marginRight ?? '0.75rem'}}>
      <NavLink
        to={route}
        style={isCurrent ? currentStyle : notCurrentStyle}
      >{title}</NavLink>
    </Nav.Item>);
  }

  // if (showLanguageSelector) {
  //   languageSelector = (<NavDropdown title={siteLanguage.toUpperCase()} drop="down" align="end">
  //     <NavDropdown.Item id="change-lang-en">EN - English</NavDropdown.Item>
  //     <NavDropdown.Item id="change-lang-es">ES - Español</NavDropdown.Item>
  //   </NavDropdown>);
  // }
  const logoUrl = urlGen.images() + '/apm-logo-plain.svg';

  return (<Navbar variant="light" expand="lg" style={props.style ?? {}} className="justify-content-between">
    <Container>
      <Navbar.Brand style={{cursor: 'pointer'}} onClick={() => navigate(RouteUrls.dashboard())}><img
        src={logoUrl} alt="APM" height="30"/></Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav"/>
      <Navbar.Collapse id="basic-navbar-nav">
        <MyNav route={RouteUrls.dashboard()} title={tr('Dashboard')}/>
        <MyNav route={RouteUrls.docs()} title={tr('Documents')}/>
        <MyNav route={RouteUrls.works()} title={tr('Works')}/>
        <MyNav route={RouteUrls.people()} title={tr('People')}/>
        <Nav.Item title={tr('Search')}><a href={urlGen.siteSearch()}>{tr('Search')}</a></Nav.Item>
        <Nav.Item>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Nav.Item>
        <NavDropdown id="useful-links-dropdown" title={tr('Useful Links')}>

          <NavDropdown.Item className="dd-menu-item"
                            href="https://averroes.uni-koeln.de/apm/wiki">Wiki</NavDropdown.Item>
          <NavDropdown.Item className="dd-menu-item" href="https://averroes.uni-koeln.de/legacy/">Legacy Files (e.g.,
            old XML)</NavDropdown.Item>
          <NavDropdown.Item className="dd-menu-item" href="https://averroes.uni-koeln.de/">Public
            Website</NavDropdown.Item>
        </NavDropdown>
      </Navbar.Collapse>
      <Navbar.Collapse className="justify-content-end">
        <NavDropdown id="user-dropdown" title={(<UserIcon name={userName}/>)}>
          <NavDropdown.Item className="dd-menu-item"  href={urlGen.sitePerson(Tid.toCanonicalString(userId))}>
            {tr('My Profile')}
          </NavDropdown.Item>
          <NavDropdown.Divider/>
          <NavDropdown.Item className="dd-menu-item" onClick={props.onLogout}>Logout</NavDropdown.Item>
        </NavDropdown>
      </Navbar.Collapse>


    </Container>


  </Navbar>);
}