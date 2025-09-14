// src/components/ErrorBanner.tsx
import React, { useState, useEffect } from "react";
import { atomicJSONWrite } from "@/lib/storage";
import { getLatestPersistError, subscribePersistError } from "@/lib/persistErrors";

export default function ErrorBanner() {
  const [, setTick] = useState(0);
  const error = getLatestPersistError();

  useEffect(() => {
    const unsub = subscribePersistError(() => setTick(x => x + 1));
    return unsub;
  }, []);

  if (!error) return null;

  function handleRetry() {
    try {
      if (error.key && error.payload) atomicJSONWrite(error.key, error.payload);
    } catch (e) { console.error("Retry failed", e); }
    setTick(x => x + 1);
  }

  function handleViewLogs() {
    console.error("Persistence error log:", error);
    alert(`See console for logs of key "${error.key}"`);
  }

  return (
    <div className="errorBanner" role="alert">
      <span className="msg">Persistence error: {error.message}</span>
      <div className="actions">
        <button onClick={handleRetry}>Retry</button>
        <button onClick={handleViewLogs}>View logs</button>
      </div>
    </div>
  );
}
