import { Workspace } from "@/components/workspace";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Workspace roles={["ADMIN"]}>{children}</Workspace>;
}
