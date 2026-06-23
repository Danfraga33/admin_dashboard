import { redirect } from "react-router";
import type { Route } from "./+types/api.ingest";
import { runIngest, type IngestResult } from "~/lib/radar/ingest.server";

export async function loader() {
  return redirect("/");
}

export async function action({ request }: Route.ActionArgs): Promise<IngestResult> {
  const form = await request.formData();
  const sid = form.get("sourceId");
  const sourceId = sid ? Number(sid) : undefined;

  try {
    return await runIngest(Number.isFinite(sourceId) ? sourceId : undefined);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      runs: [],
      mentionsAdded: 0,
      complaintsAdded: 0,
      alertsCreated: 0,
      error: message,
    };
  }
}
