import {createRoot} from "react-dom/client";
import "bootstrap5/dist/css/bootstrap.min.css";
import "./index.css";
import App from "@/ReactAPM/App";

// @ts-ignore
// Stop the loading sign from writing to the window's body
window.loading = false;

createRoot(document.body).render(<App/>);








