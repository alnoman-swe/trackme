# TrackMe — daily work log (design)

## Why
The team writes daily work in a shared Google Doc. Some people don't write every day, and in the doc that is easy to miss. The site must make writing quick and make a missing entry obvious.

## Goals
- Each person writes what they got done today in one free-text box.
- Anyone can see at a glance who has and hasn't written, today and over recent days.
- Leaders (and anyone else) can comment on an entry.
- No login. Slack-like look: coloured sidebar, soft and calm colours.

## Non-goals
- Login, permissions, Slack reminders, export, task statuses, dark theme.

## Anti-goal
- A feed or layout where a person who wrote nothing simply doesn't appear.

## Approaches considered
1. **Day board plus who-wrote grid (chosen).** One card per person per day, with empty cards shown as "not written yet", and a grid of people against recent days. Makes gaps visible, which is the reason for the project.
2. **Spreadsheet copy of the Google Doc.** Familiar, but long text is cramped in cells and gaps are as easy to overlook as they are today.
3. **Slack-style message feed.** Fastest to post in, but people who didn't post are invisible.

The stack and approach were left to the builder; approach 1 is the builder's call.

## Design
**Identity.** On first visit, pick your name from the team list; the browser remembers it. Anyone can add a person (name and role: Dev, QA, Manager, Leader) or switch who they are. This is trust-based: anyone can technically write as anyone.

**Day board (home, opens on today).** Slack-style sidebar with recent dates and the people list. The main area shows the selected day with cards grouped by role. The header shows "7 of 10 written". Your own card is a text box that saves by itself as you type. A card with no entry shows "Not written yet" in a soft amber. Each card shows the time it was last saved, so entries filled in late are visible. Past days can still be filled in.

**Comments.** A thread under each card; anyone can comment, and the comment is signed with the name they picked.

**Who-wrote grid.** People down the side, the last 14 days across, a filled dot where an entry exists and an empty one where it doesn't. Clicking a dot opens that day. A day on which nobody wrote is treated as a day off and shown greyed out, so weekends and holidays need no setup.

**Emails.** Each person has an email address, and any person can be marked as an admin, both set on the people screen. On working days:
- At the reminder time, everyone who has not written today gets an email asking them to update, with a link to today's board.
- At the summary time, admins get one email listing who submitted and who did not.

Working days, the two times and the timezone are settings in the config file (defaults: Monday to Friday, reminder 18:00, summary 20:00). Each email goes out once per day even if the server restarts. Emails are not sent on non-working days. In the who-wrote grid, non-working days are greyed out as well.

**Freshness.** The page refetches every few seconds, so other people's entries and comments appear without a manual refresh.

## Technical (builder's calls)
- Next.js App Router, server actions, plain CSS.
- Postgres 16 in Docker via `docker-compose.yml`; accessed through Prisma 7 (schema in `prisma/schema.prisma`, migrations in `prisma/migrations`).
- Tables: `people(id, name, role)`, `entries(person_id, day, body, updated_at, primary key (person_id, day))`, `comments(id, person_id, day, author_id, body, created_at)`.
- Refetch by polling `router.refresh()`; move to websockets only if polling becomes a problem.
- `people` also has `email` and `is_admin`. A `sent_emails(day, kind, primary key (day, kind))` table stops duplicate sends.
- Email through the Resend HTTP API with `fetch`; API key in `.env`.
- Scheduling: a once-a-minute timer started in `instrumentation.ts` checks whether a send is due. This needs one always-on server (`next start` or Docker), so it will not work on serverless hosting such as Vercel; move to a cron-triggered route if hosting changes.
- One small test for the day-off and written-count logic.
