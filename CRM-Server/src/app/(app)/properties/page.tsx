import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PropertiesClient from "./PropertiesClient";

export default async function PropertiesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <Suspense>
      <PropertiesClient />
    </Suspense>
  );
}
