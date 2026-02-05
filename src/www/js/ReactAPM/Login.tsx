import {KeyboardEvent, RefObject, useContext, useRef, useState} from "react";
import {AppContext} from "./App";
import {urlGen} from "@/pages/common/SiteUrlGen";
import '../../css/login.css';
import {Button, Form, InputGroup} from "react-bootstrap";
import {Eye, EyeSlash} from "react-bootstrap-icons";

export default function Login() {

  document.title = "APM Login";

  const appContext = useContext(AppContext);
  const logoUrl = urlGen.images() + '/apm-logo-plain.svg';

  const [buttonDisabled, setButtonDisabled] = useState<boolean | undefined>(true);
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const userNameInput: RefObject<HTMLInputElement | null> = useRef(null);
  const passwordInput: RefObject<HTMLInputElement | null> = useRef(null);
  const rememberMeCheckBox: RefObject<HTMLInputElement | null> = useRef(null);

  const handleFormChange = () => {
    const userName = userNameInput.current?.value.trim() ?? '';
    const password = passwordInput.current?.value.trim() ?? '';

    if (userName && password) {
      setButtonDisabled(false);
    } else {
      setButtonDisabled(true);
    }
  };

  const handleShowPassword = () => {
    setShowPassword(prev => !prev);
  };

  const handleLogin = async () => {
    const userName = userNameInput.current?.value.trim() ?? '';
    const password = passwordInput.current?.value.trim() ?? '';
    const rememberMe = rememberMeCheckBox.current?.checked ?? false;
    if (userName && password) {
      // let's roll
      const success = await appContext.apiClient.apiLogin(userName, password, rememberMe);
      if (success) {
        window.location.href = appContext.reactAppBaseUrl + '/';
      } else {
        setLoginError('Login failed');
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      console.log('Enter pressed');
      handleLogin().then();
    }
  };

  return (<div className="login-div" onKeyDown={handleKeyDown}>
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
          <InputGroup>
            {showPassword ? (
              <Form.Control ref={passwordInput} type="text" placeholder="Password" onChange={handleFormChange}/>) : (
              <Form.Control ref={passwordInput} type="password" placeholder="Password" onChange={handleFormChange}/>)}
            <Button variant="outline-secondary" onClick={handleShowPassword}>{showPassword ? (<EyeSlash/>) : (
              <Eye/>)}</Button>

          </InputGroup>

        </Form.Group>
        <Form.Group className="mb-3" controlId="formBasicCheckbox">
          <Form.Check ref={rememberMeCheckBox} type="checkbox" label="Remember me"/>
        </Form.Group>
        <Button variant="primary" disabled={buttonDisabled} onClick={handleLogin}>
          Login
        </Button>
        <div>{loginError}</div>
      </Form>
    </div>
  </div>);

}