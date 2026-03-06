import { Suspense } from "react";
import ContactsClient from "./ContactsClient";

export const dynamic = "force-dynamic";

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400 text-sm">Loading...</div>}>
      <ContactsClient />
    </Suspense>
  );
}
