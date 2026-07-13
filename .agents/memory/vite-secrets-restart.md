---
name: Client-side Vite env secrets need a restart
description: Why a Vite dev server can keep warning that env vars are missing right after secrets are added
---

Adding Replit Secrets (e.g. VITE_* keys consumed via `import.meta.env`) does not
retroactively change a running process's environment. The already-running Vite
dev server process still has the old `process.env` snapshot from before the
secret existed.

**Why:** Confirmed while setting up a Supabase-backed Vite app — after
`requestSecrets` completed, the browser console kept logging the "Supabase not
configured" warning until the workflow was explicitly restarted, even though a
fresh shell showed the vars present.

**How to apply:** After secrets/env vars are added or changed for a
frontend-build tool (Vite, webpack dev server, etc.), restart the workflow and
re-check logs from *after* the restart timestamp — don't trust console lines
whose timestamp predates the restart.
