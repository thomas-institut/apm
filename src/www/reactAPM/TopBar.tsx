import {tr} from "@/pages/common/SiteLang";
import {urlGen} from "@/pages/common/SiteUrlGen";
import {Tid} from "@/Tid/Tid";
import {CSSProperties, ReactNode, useContext} from "react";
import {Container, Navbar, Nav, NavDropdown} from "react-bootstrap";

import {useNavigate} from "react-router";
import {AppContext} from "./index";


interface TopBarProps {
  style?: CSSProperties
}
/*
 * APM's Standard Top Bar
 *
 */
export default function TopBar(props: TopBarProps = {}): ReactNode {

  const context = useContext(AppContext);
  const showLanguageSelector = context.showLanguageSelector ?? false;
  const siteLanguage = context.siteLanguage ?? 'en';
  const userId = context.userId ?? 0;
  const userName = context.userName ?? 'No User';
  let languageSelector: ReactNode = (<></>);
  const baseUrl = context.reactAppBaseUrl;
  const navigate = useNavigate();
  const goTo = (url: string) => (ev: any  ) => {
    ev.preventDefault();
    navigate(baseUrl + url);
  };

  interface RoutedNavLinkProps {
    route: string;
    title: string;
  }

  function MyNav(props: RoutedNavLinkProps) {
    const route = props.route;
    const title = props.title;
    return (<Nav.Link href={context.reactAppBaseUrl + route} onClick={goTo(route)}>{title}</Nav.Link>);
  }



  if (showLanguageSelector) {
    languageSelector = (<ul className="navbar-nav">
      <li className="nav-item dropdown">
        <a className="nav-link dropdown-toggle" href="#" data-toggle="dropdown" role="button" aria-haspopup="true"
           aria-expanded="false">
          ${siteLanguage.toUpperCase()}</a>
        <ul className="dropdown-menu dropdown-menu-right">
          <li><a className="nav-link" href="#" id="change-lang-en">EN - English</a></li>
          <li><a className="nav-link" href="#" id="change-lang-es">ES - Español</a></li>
        </ul>
      </li>
    </ul>);
  }
  const logoUrl = urlGen.images() + '/apm-logo-plain.svg';



  return (<Navbar variant="light" expand="lg" style={props.style ?? {}}>
    <Container >
      <Navbar.Brand href={baseUrl + '/'} onClick={goTo('/')}><img src={logoUrl} alt="APM" height="40"/></Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <MyNav route="/" title={tr('Dashboard')}/>
        <MyNav route="/docs" title={tr('Documents')}/>
        <MyNav route="/works" title={tr('Works')}/>
        <MyNav route="/people" title={tr('People')}/>
        <MyNav route="/search" title={tr('Search')}/>
        <Nav.Item>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Nav.Item>
        <NavDropdown id="useful-links-dropdown" title={tr('Useful Links')}>
          <NavDropdown.Item className="dd-menu-item" href="https://averroes.uni-koeln.de/apm/wiki">Wiki</NavDropdown.Item>
          <NavDropdown.Item className="dd-menu-item" href="https://averroes.uni-koeln.de/legacy/">Legacy Files (e.g., old XML)</NavDropdown.Item>
          <NavDropdown.Item className="dd-menu-item" href="https://averroes.uni-koeln.de/">Public Website</NavDropdown.Item>
        </NavDropdown>
      </Navbar.Collapse>
    </Container>

      <div id="navbar" className="collapse navbar-collapse">
        <ul className="navbar-nav">
          <li className="nav-item dropdown">
            <a className="nav-link dropdown-toggle" href="#" data-toggle="dropdown" role="button" aria-haspopup="true"
               aria-expanded="false">
              <i className="fas fa-user"></i>&nbsp;{userName}</a>
            <ul className="dropdown-menu dropdown-menu-right">
              <li><a className="nav-link dd-menu-item"
                     href={urlGen.sitePerson(Tid.toBase36String(userId))}>{tr('My Profile')}</a></li>
              <li role="separator" className="divider"></li>
              <li><a className="nav-link dd-menu-item" href={urlGen.siteLogout()}
                     title={tr('Logout')}>{tr('Logout')}</a></li>
            </ul>
          </li>
        </ul>
        {languageSelector}
      </div>
  </Navbar>);
}