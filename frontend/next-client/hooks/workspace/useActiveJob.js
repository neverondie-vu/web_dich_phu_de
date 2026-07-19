export function useActiveJob(user) {
  function activeJobStorageKey() {
    return `autosub-active-job:${user?.uid || "guest"}`;
  }

  function readActiveJob() {
    if (typeof window === "undefined") return null;
    try {
      const value = window.localStorage.getItem(activeJobStorageKey());
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  function saveActiveJob(patch) {
    if (typeof window === "undefined") return;
    const nextValue = { ...(readActiveJob() || {}), ...patch, updatedAt: Date.now() };
    window.localStorage.setItem(activeJobStorageKey(), JSON.stringify(nextValue));
  }

  function clearActiveJob() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(activeJobStorageKey());
  }

  return {
    activeJobStorageKey,
    clearActiveJob,
    readActiveJob,
    saveActiveJob,
  };
}
