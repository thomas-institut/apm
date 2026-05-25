import {useContext} from "react";
import {ApeContext} from "@/App/App";
import {Nav, Navbar} from "react-bootstrap";
import {Link} from "react-router";

export function NormalPageTopBar() {
  const context = useContext(ApeContext);

  if (!context.appConfig) {
    return <></>;
  }

  const appName = context.appConfig.shortName;
  return (
    <Navbar expand="lg" style={{backgroundColor: 'transparent'}}>
      <Navbar.Brand as={Link} to="/">{appName}</Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="me-auto">
          <Nav.Link as={Link} to="/">Home</Nav.Link>
          <Nav.Link as={Link} to="/about">About</Nav.Link>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
}
