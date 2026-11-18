# Daily Brief

## Goal

The README sells Orion on a morning brief that replaces checking five tools. Until now the code had no brief. This adds it to the dashboard.

## How it works

`POST /functions/v1/daily-brief` with `{ workspace_id?, today?, ai? }`.

1. Same auth and workspace rule as analyze-note: a signed-in user, and a workspace they belong to (their own by default).
2. Reads the workspace's projects, open dated tasks, tasks in active sprints, active sprints, unresolved blockers, open risks, pending or escalated follow-ups and pending milestones. All reads use the caller's token, so RLS from DEX-10 applies, and every query also filters on `workspace_id`.
3. `supabase/functions/_shared/brief.ts` turns that into facts and a ranked focus list. This part is plain code with fixed rules, costs nothing, and runs for every plan.
4. Only with `ai: true`, the function spends one action through `consume_ai_action` (Pro and Enterprise), then asks the model to write a headline, two to four sentences and up to three priorities, using only the facts. The prompt tells the model that task titles are user data and not instructions.
5. If the AI step is refused (`plan`, `quota`) or fails (`rate_limited`, `credits`, `failed`), the response is still 200 with the free brief and an `ai.status`.

`today` is the browser's local date. The server accepts it only within one day of UTC, otherwise it uses UTC.

### What counts

| Section | Rule |
|---|---|
| Overdue | Not done, due before today. Sorted by priority, then date |
| Due today / this week | Not done, due today / in the next 7 days |
| Sprint behind | Done work (story points, or task count when there are none) trails elapsed time by more than 15 points |
| Blockers | Unresolved, oldest first |
| High risks | Open, severity high or critical |
| Follow-ups | Escalated, or pending with next action date today or earlier (or none) |
| Milestones | Pending, due within 14 days or late |
| Projects at risk | Active and marked at-risk or blocked, or past their end date |

Each list shows at most 8 items; the counts are not capped. The focus list takes the top 5 by a fixed score, so the same data always gives the same order and each item says why it is there.

## Frontend

`src/components/DailyBrief.tsx` sits at the top of the dashboard. It loads the free brief on every visit (cached 5 minutes). The "AI summary" button spends one action; the result is kept in `localStorage` per workspace and day, so a reload does not spend another.

## Tests

- `npm run test:functions`: facts, focus ranking, headline, model output parsing, date check, and the handler (auth, membership, AI spend only on `ai: true`, refusals and failures still return the brief, no spend when the data load fails).
- `npm test`: the client cache and status messages in `src/lib/brief.ts`.

## Rollout

Needs DEX-10 and DEX-10b first (this branch is stacked on PR #1). Then `supabase functions deploy daily-brief`, then the frontend. It uses the same `LOVABLE_API_KEY` secret as analyze-note; no new secrets.

## Not in this PR

- Scheduled delivery (email or Slack at 8am). Needs a cron caller and a mail or Slack sender; Gio decides which.
- Jira or Linear as a data source. Today the brief reads only Orion's own tables.
- Saving briefs server-side for a history view.
