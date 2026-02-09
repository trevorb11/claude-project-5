const CRON_INTERVAL_MS = 5 * 60 * 1000;

let intervalId: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
let started = false;

async function runScheduledScans() {
  if (isRunning) return;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return;
  }

  isRunning = true;

  try {
    const port = process.env.PORT || 5000;
    const url = `http://localhost:${port}/api/cron`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": cronSecret,
      },
    });

    if (response.ok) {
      const result = await response.json();
      if (result.scanned > 0) {
        console.log(`[Scheduler] Completed scans: ${JSON.stringify(result.results)}`);
      }
    } else {
      console.warn(`[Scheduler] Cron endpoint returned ${response.status}`);
    }
  } catch (error) {
    console.error("[Scheduler] Error:", error instanceof Error ? error.message : error);
  } finally {
    isRunning = false;
  }
}

export function startScheduler() {
  if (started || intervalId) return;
  started = true;

  console.log(`[Scheduler] Starting research scanner (every ${CRON_INTERVAL_MS / 1000}s)`);
  intervalId = setInterval(runScheduledScans, CRON_INTERVAL_MS);

  setTimeout(runScheduledScans, 30000);
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    started = false;
    console.log("[Scheduler] Stopped");
  }
}
