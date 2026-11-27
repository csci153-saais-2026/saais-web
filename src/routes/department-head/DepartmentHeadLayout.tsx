import { Outlet } from "react-router";
import { useAuth } from "@/hooks/use-auth";

function DepartmentHeadWorkspace() {
  return <Outlet />;
}

export function DepartmentHeadLayout() {
  const { user } = useAuth();
  return <DepartmentHeadWorkspace key={user?.id} />;
}
