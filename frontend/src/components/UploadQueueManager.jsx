// frontend/src/components/UploadQueueManager.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import UploadQueuePanel from "./UploadQueuePanel";
import {
  getPendingUploadCount,
  listUploadJobs,
  processUploadQueue,
  retryUploadJob,
  retryUploadJobWithoutIsbn,
  deleteUploadJob,
} from "../utils/uploadQueue";

export default function UploadQueueManager() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [jobs, setJobs] = useState([]);
  const runningRef = useRef(false);

  const hasIssues = useMemo(
    () => jobs.some((j) => j.status === "error" || j.status === "blocked"),
    [jobs]
  );

  async function refresh() {
    const [c, j] = await Promise.all([getPendingUploadCount(), listUploadJobs()]);
    setCount(c);
    setJobs(j);
  }

  async function runOnce(maxJobs = 2) {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      await processUploadQueue({ maxJobs });
    } finally {
      runningRef.current = false;
      await refresh();
    }
  }

  useEffect(() => {
    refresh().then(() => runOnce(2)).catch(() => {});
    const onOnline = () => runOnce(3).catch(() => {});
    const onVis = () => {
      if (document.visibilityState === "visible") runOnce(2).catch(() => {});
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVis);

    // periodic nudge
    const t = setInterval(() => runOnce(1).catch(() => {}), 30000);

    return () => {
      clearInterval(t);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // floating button appears when needed
  if (count === 0 && !hasIssues && !open) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: 12,
          bottom: 12,
          zIndex: 9998,
          padding: "10px 12px",
          borderRadius: 999,
          border: "1px solid rgba(0,0,0,0.18)",
          background: "white",
          boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
          fontWeight: 800,
          cursor: "pointer",
        }}
        title="Upload-Warteschlange öffnen"
      >
        Uploads: {count}
        {hasIssues ? " ⚠️" : ""}
      </button>

      {open ? (
        <UploadQueuePanel
          jobs={jobs}
          onClose={() => setOpen(false)}
          onProcessNow={() => runOnce(3)}
          onRetry={async (id) => {
            await retryUploadJob(id);
            await refresh();
            await runOnce(2);
          }}
          onRetryNoIsbn={async (id) => {
            await retryUploadJobWithoutIsbn(id);
            await refresh();
            await runOnce(2);
          }}
          onDelete={async (id) => {
            await deleteUploadJob(id);
            await refresh();
          }}
        />
      ) : null}
    </>
  );
}