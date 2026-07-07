---
name: bug
description: Bug fix loop. Populate app/specs/bug-<slug>.md from the bug template, investigate root cause, implement the fix commit-by-commit, verify all criteria, then open a PR. Use when the user types /bug <description>.
---

# Bug Fix

Turn a one-line symptom into a populated bug spec, fix it at the root cause, and open a PR.

The `args` are the user's plain-English description of the bug symptom. It becomes the slug and seed for the spec.

---

## Step 1 — Investigate root cause

Read `app/specs/bug-template.md` to get the template structure.

Trace the symptom through the codebase:
- Find every file and function involved in the broken path
- Read every caller of the function you're about to touch — the fix goes where all callers route through, not just the reported path
- Identify the actual root cause, not the surface symptom

Do not skip this step. A wrong root cause = a fix that breaks sibling callers.

---

## Step 2 — Create the spec file

Generate a kebab-case slug from the description (e.g. "login redirect broken" → `login-redirect-broken`).

Write a NEW file `app/specs/bug-<slug>.md` — never overwrite the template.

Populate every section with real facts from the investigation:
- **Symptom** — what the user sees
- **Repro** — numbered steps to reproduce
- **Root cause** — the actual cause (specific file, function, line)
- **Fix** — what to change and where
- **Verify** — `- [ ]` checklist: repro no longer works + related paths still work

---

## Step 3 — Show spec & confirm

Print the full spec to the user.

Ask: "Does this spec look right? Any changes before I start?"

Apply corrections and re-save. Only proceed once confirmed.

---

## Step 4 — Create branch

```bash
git checkout -b fix/<slug>
```

Never push to `main`.

---

## Step 5 — Fix loop

Work through each item in the **Fix** section one at a time:

1. Implement the fix
2. Tick it off in the spec file: `- [ ]` → `- [x]`
3. Commit: `fix(<slug>): <item text>`

Fix the root cause — check every caller of modified functions, not just the reported path.

---

## Step 6 — Verify loop

Work through each `- [ ]` item in **Verify**:

1. Test the criterion (run the app, `npx vitest run`, check behavior)
2. If passes: tick it off, commit the spec update
3. If fails: fix it, commit the fix, tick it off

Final commit once all items are `[x]`:
```
chore(<slug>): mark spec complete
```

---

## Step 7 — Open PR

```bash
git push -u origin fix/<slug>
gh pr create \
  --base main \
  --title "fix(<slug>): <Symptom summary>" \
  --body "$(cat app/specs/bug-<slug>.md)"
```

Return the PR URL.

---

## Constraints

- Never commit `.env`, credentials, or secrets
- Never force-push or skip hooks
- Run `npx biome check` before final commit if touching JS/TS
- TMDB API key must never appear in client-side code
