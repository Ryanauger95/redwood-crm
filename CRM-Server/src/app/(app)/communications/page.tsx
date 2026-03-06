import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CommunicationsClient } from "./CommunicationsClient";

export default async function CommunicationsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <CommunicationsClient />;
}
