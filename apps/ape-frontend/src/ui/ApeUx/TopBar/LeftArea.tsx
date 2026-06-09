import HomeIcon from "@/ui/ApeUx/Icons/HomeIcon";
import Logo from "@/ui/ApeUx/Icons/Logo";
import AboutIcon from "@/ui/ApeUx/Icons/AboutIcon";
import {Link} from "react-router";


export default function LeftArea() {
  return <div className="leftArea">
    <Logo/>
    <Link to="/" title="Home"><HomeIcon/></Link>
    <Link to="/about" title="About"><AboutIcon/></Link>
  </div>
}
