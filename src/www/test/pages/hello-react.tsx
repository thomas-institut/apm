import {createRoot} from "react-dom/client";
import HelloWorld from "@/Components/HelloWorld";


const root = createRoot(document.getElementById("app")!);

root.render(<HelloWorld/>)