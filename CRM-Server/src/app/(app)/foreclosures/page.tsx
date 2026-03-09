import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ForeclosuresClient from "./ForeclosuresClient";

export default async function ForeclosuresPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <Suspense>
      <ForeclosuresClient />
    </Suspense>
  );
}
