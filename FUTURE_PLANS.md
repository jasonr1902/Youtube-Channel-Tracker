# Future Plans

This file tracks planned features that are not yet built. When a feature is implemented, remove it from this file.

**When the user asks "what should we do next?", check this file first and suggest items from it.**

---

## Production Analytics Page

A dedicated analytics page focused on the *production pipeline* itself (not YouTube performance metrics — that's the existing Analytics page). Key metrics to include:

- **Average time per stage** — how many days a video spends in Idea, Script, Filming, Editing, Scheduled before publishing
- **Idea → Published conversion rate** — what % of ideas ever reach Published stage
- **Stage funnel visualization** — how many videos are in each stage over time (like a funnel chart)
- **Fastest / slowest videos** — which videos moved through production fastest/slowest
- **Stage bottleneck detection** — which stage do videos get stuck in most

**Data source:** `video_stage_history` table (already populated — every stage transition is recorded, and initial stage is recorded on creation via the `track_initial_stage` DB trigger added in v5).

**When built:** remove this section and the `video_stage_history` note above.

---

## Script Attachment for Ideas

Allow users to attach a script file to any idea/video and track metadata about it.

**Script metadata (stored in DB, manually entered by user):**
- **Word count** — number field, user types it in manually
- **Draft quality** — dropdown with two options: `Rough Draft` / `Final Draft`

**File attachment:**
- User picks a script file from their filesystem
- Supported formats: `.docx` (Word), `.pages` (Apple Pages), `.pdf`
- File path (or a copy) is stored so it can be reopened

**Preview:**
- A "Preview Script" button opens the file in the user's default app for that format (e.g. Preview.app for PDF, Pages for .pages, Word/LibreOffice for .docx)
- This can be done with Electron's `shell.openPath()` — no need to render the file inside the app

**Where it lives:**
- Script section added to the idea detail/edit panel (the drawer or modal that opens when you click an idea)
- Show word count and draft quality as badges on the pipeline card if a script is attached

**DB change needed:**
- Add `script_path`, `script_word_count`, and `script_draft_quality` columns to the `videos` (or `ideas`) table

---

## Gamification — Steps, XP, Levels & Achievements

A system that makes working through ideas feel rewarding. Two interconnected pieces: a steps/substeps checklist on each idea, and a persistent XP/level progression system with unlockable rewards.

---

### Part 1 — Steps & Substeps on Ideas

Each idea can have a user-defined list of **steps** (e.g. "Write outline", "Film B-roll"). Each step can have **substeps** (e.g. "Film intro", "Film main segment"). Rules:

- Substeps are optional — a step can exist with no substeps and be checked off directly
- If a step has substeps, it auto-completes when **all substeps are checked**; it cannot be manually checked while substeps exist
- Unchecking any substep un-completes the parent step
- Steps and substeps can be reordered (drag handles) and deleted
- Steps/substeps are stored per-idea in the DB (new tables: `idea_steps`, `idea_substeps`)

**Progress bar:**
- A persistent bar at the bottom of the screen shows `completed steps / total steps` across **all active ideas**
- Updates in real time as steps are checked/unchecked
- Clicking it could expand a summary panel showing which ideas have incomplete steps

**Completion animation:**
- When a step is marked complete, play a satisfying animation (e.g. confetti burst, checkmark pop, particle effect) scoped to that card/area
- Use a lightweight library like `canvas-confetti` or a CSS keyframe animation — nothing heavy

---

### Part 2 — XP & Level System

**XP rules:**
- Completing a step awards XP (suggest: flat amount per step, e.g. 50 XP, regardless of substep count)
- Unchecking a step (or unchecking the last substep that un-completes it) removes that XP
- XP is persistent — stored in the DB in a `user_profile` table (`total_xp_earned`, `current_xp`, `current_level`)
- `current_xp` is the XP within the current level band; `total_xp_earned` is lifetime total (never decreases for analytics — only `current_xp` goes down on undo)

**Level scaling:**
- Exponential curve so early levels feel fast and later levels feel like a real grind
- Suggested formula: XP required to reach level N = `base * (N ^ exponent)` — e.g. `100 * (N ^ 1.8)` (tune in implementation)
- No level cap — levels scale upward indefinitely

**Unlocks:**
- Each level (or milestone level) unlocks something in the app
- Examples: unique color schemes / themes (sidebar accent color, card color, dark variants), decorative badges shown on the profile tab, animated backgrounds on the dashboard
- Store unlocked rewards in DB; apply active theme via a CSS variable or Tailwind class on the root element
- Design the unlock system to be extensible — a `rewards` table with `reward_type`, `reward_key`, `unlocked_at_level` so new rewards can be added without schema changes

---

### Part 3 — Profile / Achievement Tab

A dedicated tab (in the existing Settings sidebar or as its own sidebar item: **Profile** or **Achievements**).

**Milestone tracker:**
- Shows current level prominently with a large XP progress bar (`current_xp / xp_to_next_level`)
- Below it: a list/grid of milestone levels (5, 10, 25, 50, 100, etc.) showing achieved vs. locked, with the date each was reached
- Locked milestones show the XP still needed

**Level timeline graph:**
- A horizontal side-scrolling timeline where each node is a level-up event
- X-axis = date achieved, Y-axis optional (or flat line with nodes)
- Hovering/clicking a node shows: level reached, date, total XP at that point
- Build with Recharts (already a dependency) — a `LineChart` or scatter plot works well
- Only shows levels that have been achieved; grows over time

**Stats panel (optional but nice):**
- Total steps completed (lifetime)
- Total ideas with all steps finished
- Current streak (days with at least one step completed)

---

### DB Changes Needed

- `idea_steps` — `id`, `idea_id`, `title`, `order`, `completed_at`
- `idea_substeps` — `id`, `step_id`, `title`, `order`, `completed_at`
- `user_profile` — `id`, `current_xp`, `current_level`, `total_xp_earned`
- `level_history` — `id`, `level`, `achieved_at`, `xp_at_achievement`
- `rewards` — `id`, `reward_type`, `reward_key`, `unlocked_at_level`, `label`
- `user_unlocks` — `id`, `reward_id`, `unlocked_at`

---

## Instructions for Managing This File

- Items in this file are features the user asked to defer for later
- When the user asks "what should we do next?" or "what's planned?", reference this file
- When a feature is fully implemented, delete its section from this file
- Keep descriptions specific enough that a future session can implement them without asking the user to re-explain
