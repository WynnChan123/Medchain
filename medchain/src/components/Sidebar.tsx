import useStore from "@/store/userStore";
import AdminSideBar from "./Sidebar/AdminSideBar";
import { UserRole } from "../../utils/userRole";

export default function Sidebar(){
  const role = useStore((state) => state.role);

  return(
    <div>
      { role === UserRole.Admin && <AdminSideBar />}
    </div>
  )
}