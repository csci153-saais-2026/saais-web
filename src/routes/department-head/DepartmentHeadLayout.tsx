import { Outlet } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { DepartmentToastProvider } from "./shared/DepartmentToastProvider";

function DepartmentHeadWorkspace() {
  return (
    <DepartmentToastProvider>
      <Outlet />
    </DepartmentToastProvider>
  );
}

export function DepartmentHeadLayout() {
  const { user } = useAuth();
  return <DepartmentHeadWorkspace key={user?.id} />;
}
