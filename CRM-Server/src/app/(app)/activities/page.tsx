import { Suspense } from "react";
import ActivitiesClient from "./ActivitiesClient";

export const dynamic = "force-dynamic";

export default function ActivitiesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400 text-sm">Loading...</div>}>
      <ActivitiesClient />
    </Suspense>
  );
}
