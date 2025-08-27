import {RefObject, useContext, useRef, useState} from "react";
import {AppContext} from "./index";
import {urlGen} from "@/pages/common/SiteUrlGen";
import '../css/login.css';
import {Button, Form} from "react-bootstrap";

export default function Login() {

  document.title = "Login";

  const context = useContext(AppContext);
  const logoUrl = urlGen.images() + '/apm-logo-plain.svg';

  const [buttonDisabled, setButtonDisabled] = useState<boolean | undefined>(true);
  const [loginError, setLoginError] = useState('');
  const userNameInput: RefObject<HTMLInputElement | null> = useRef(null);
  const passwordInput: RefObject<HTMLInputElement | null> = useRef(null);

  const handleFormChange = () => {
    const userName = userNameInput.current?.value.trim() ?? '';
    const password = passwordInput.current?.value.trim() ?? '';
    if (userName && password) {
      setButtonDisabled(false);
    } else {
      setButtonDisabled(true);
    }
  };

  const handleLogin = async () => {
    const userName = userNameInput.current?.value.trim() ?? '';
    const password = passwordInput.current?.value.trim() ?? '';
    if (userName && password) {
      // let's roll
      const success = await context.dataProxy.apiLogin(userName, password, true);
      if (success) {
        window.location.href = context.reactAppBaseUrl + '/';
      } else {
        setLoginError('Login failed');
      }
    }
  }

  return (<div className="login-div">
    <div className="mb-3" style={{display: "flex", justifyContent: "space-around", width: "100%"}}>
      <span className="login-logo">APM</span> <img src={logoUrl} alt="APM" width="250"/>
    </div>
    <div>
      <Form>
        <Form.Group className="mb-3" controlId="formBasicEmail">
          <Form.Label>Username</Form.Label>
          <Form.Control ref={userNameInput} type="text" placeholder="Enter your APM username"
                        onChange={handleFormChange}/>
        </Form.Group>

        <Form.Group className="mb-3" controlId="formBasicPassword">
          <Form.Label>Password</Form.Label>
          <Form.Control ref={passwordInput} type="password" placeholder="Password" onChange={handleFormChange}/>
        </Form.Group>
        <Form.Group className="mb-3" controlId="formBasicCheckbox">
          <Form.Check type="checkbox" label="Remember me"/>
        </Form.Group>
        <Button variant="primary" disabled={buttonDisabled} onClick={handleLogin}>
          Login
        </Button>
        <div>{loginError}</div>
      </Form>
    </div>
  </div>);

}