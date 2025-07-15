import useStore from "@/store/userStore";
import AdminSideBar from "./Sidebar/AdminSideBar";

export default function Sidebar(){
  const role = useStore((state) => state.role);

  return(
    <div>
      { role === "Admin" && <AdminSideBar />}
    </div>
  )
}