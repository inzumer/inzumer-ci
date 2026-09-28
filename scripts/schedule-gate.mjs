// GitHub schedules are UTC only. Workflows that must run at a local time (e.g. noon in Madrid)
// declare one cron per UTC offset (summer and winter) and call this gate: it prints `run=true`
// only for the cron whose hour matches the local hour today. Manual runs always pass.
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** UTC hour at which it is `localHour` in `timeZone` on `date`. */
export const utcHourFor = (localHour, timeZone, date = new Date()) => {
  const local = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(date),
  );
  const offset = (local - date.getUTCHours() + 24) % 24;
  return (localHour - offset + 24) % 24;
};

/** Whether a run triggered by `schedule` (a cron string, empty for manual runs) should go on. */
export const shouldRun = (schedule, localHour, timeZone, date = new Date()) => {
  if (!schedule) {
    return true;
  }
  const cronHour = Number(schedule.trim().split(/\s+/)[1]);
  return cronHour === utcHourFor(localHour, timeZone, date);
};

const main = () => {
  const run = shouldRun(
    process.env.SCHEDULE ?? "",
    Number(process.env.LOCAL_HOUR ?? 12),
    process.env.TIME_ZONE ?? "Europe/Madrid",
  );
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `run=${run}\n`);
  }
  process.stdout.write(`run=${run}\n`);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
