import { api } from "./api.js";

function latestBy(items, key) {
  const map = new Map();
  for (const item of items || []) if (!map.has(item[key])) map.set(item[key], item);
  return map;
}

export async function syncLatestGroundedDiary() {
  await api("/diary/shared-days/rebuild", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  const [dayData, entryData, jobData] = await Promise.all([
    api("/diary/shared-days"), api("/diary/entries"), api("/diary/jobs"),
  ]);
  const entries = latestBy(entryData.entries, "shared_day_id");
  const jobs = latestBy(jobData.jobs, "shared_day_id");
  let jobItems = jobData.jobs || [];
  const candidate = (dayData.days || []).find((day) => day.latestVersion?.boundary_state === "sealed"
    && !entries.has(day.id) && !jobs.has(day.id));
  if (candidate) {
    const generation = await api(`/diary/shared-days/${candidate.id}/generate`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    if (generation.job) jobItems = [generation.job, ...jobItems];
  }
  return { days: dayData.days || [], entries: entryData.entries || [], jobs: jobItems };
}
