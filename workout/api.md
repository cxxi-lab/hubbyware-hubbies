# Workouts — its API

## timeline.items

The interface of a calendar's dated items (Planner shows them): the sessions between `start` and
`end` (ISO date-times), dated when performed, else when scheduled. Each one's `href` opens it in
Workouts (`/history?session=<id>`). It only reads.

## For an assistant

- `programs.list()`, `programs.get({ program })`: the programs (`program` is an id or a name).
- `sessions.list({ from, to })`: the sessions in a period (ISO date-times), performed or scheduled.
  `sessions.get({ id })`: one, with each exercise's plan and what was done.
- `sessions.create({ program, scheduledAt?, performedAt?, note? })`: schedules a session (a future
  `scheduledAt`) or logs one done (`performedAt`; neither: done now). Its exercises are the program's.
