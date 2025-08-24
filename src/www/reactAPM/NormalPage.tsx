import TopBar from "./TopBar";
import {Container} from "react-bootstrap";
import {ReactNode, useContext, useEffect} from "react";
import {useNavigate} from "react-router";
import {AppContext} from "./index";


interface NormalPageProps {
  children: ReactNode;
}

export default function NormalPage(props: NormalPageProps) {

  const navigate = useNavigate();
  const context  = useContext(AppContext);

  useEffect(  () => {
    if (context.userId === -1) {
      navigate(context.reactAppBaseUrl + '/login');
    }

    context.dataProxy.whoAmI().then ( (userData) => {
      if (userData === null) {
        navigate(context.reactAppBaseUrl + '/login');
      }
    });

  });



  return (<div style={{
      height: "100dvh", display: "flex", flexDirection: "column",
    }}>
      <TopBar style={{flexGrow: 0}}/>
      <Container style={{flexGrow: 1, overflowX: "auto", overflowY: "auto"}}>
        {props.children}
      </Container>
    </div>);
}