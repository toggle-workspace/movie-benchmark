---
name: feat
description: Feature development loop. Populate app/specs/feat-<slug>.md from the feature template, implement every scope item commit-by-commit, verify all acceptance criteria, then open a PR. Use when the user types /feat <description>.
---

# Feature Development

Turn a one-line description into a populated feature spec, implement everything to completion, and open a PR.

The `args` are the user's plain-English description of the feature. It becomes the slug and seed for the spec.

---

## Step 1 — Explore

Read `app/specs/feat-template.md` to get the template structure.

Explore the codebase relevant to the description:
- Find existing components, patterns, utilities that overlap
- Identify what needs to be built vs reused — reuse first
- Note relevant file paths, existing patterns, and constraints

Do not skip this step — the spec quality depends on real codebase facts, not guesses.

---

## Step 2 — Create the spec file

Generate a kebab-case slug from the description (e.g. "add dark mode toggle" → `add-dark-mode-toggle`).

Write a NEW file `app/specs/feat-<slug>.md` — never overwrite the template.

Populate every section with real content. No placeholder text left behind:
- **What** — one sentence describing the change
- **Why** — user problem or business reason (skip if obvious)
- **Scope** — `- [ ]` checklist of discrete buildable items
- **Out of scope** — explicit list of deferred work
- **Acceptance** — `- [ ]` checklist of user-observable success criteria
- **Notes** — relevant existing code paths, constraints, prior art found in Step 1

---

## Step 3 — Show spec & confirm

Print the full spec to the user.

Ask: "Does this spec look right? Any changes before I start?"

Apply corrections and re-save the file. Only proceed once confirmed.

---

## Step 4 — Create branch

```bash
git checkout -b feat/<slug>
```

If the branch already exists, check it out. Never push to `main`.

---

## Step 5 — Implementation loop

Work through each `- [ ]` item in **Scope** one at a time:

1. Implement the item — minimum code that satisfies it, no more
2. Tick it off in the spec file: `- [ ]` → `- [x]`
3. Commit: `feat(<slug>): <item text>`
4. Move to the next item

Continue until every scope item is `[x]`.

**Rules:**
- One commit per item — keeps the PR diff reviewable
- Do not add features or refactors beyond what the item requires

---

## Step 6 — Verify loop

Work through each `- [ ]` item in **Acceptance**:

1. Test the criterion — run the app, `npx vitest run`, or check behavior manually
2. If passes: tick it off in the spec file, commit the spec update
3. If fails: fix it, commit the fix, then tick it off

Final commit once all items are `[x]`:
```
chore(<slug>): mark spec complete
```

---

## Step 7 — Open PR

```bash
git push -u origin feat/<slug>
gh pr create \
  --base main \
  --title "feat(<slug>): <What>" \
  --body "$(cat app/specs/feat-<slug>.md)"
```

Return the PR URL.

---

## Constraints

- One invocation = one spec file = one branch = one PR
- Never commit `.env`, credentials, or secrets
- Never force-push or skip hooks
- Run `npx biome check` before final commit if touching JS/TS
- TMDB API key must never appear in client-side code — all TMDB calls go through `app/api/`
