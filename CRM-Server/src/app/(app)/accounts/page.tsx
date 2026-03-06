import { Suspense } from "react";
import AccountsClient from "./AccountsClient";

export const dynamic = "force-dynamic";

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400 text-sm">Loading...</div>}>
      <AccountsClient />
    </Suspense>
  );
}
