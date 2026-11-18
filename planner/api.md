# Planner's API

The user's calendar: dated events, each in a category or none.

- Dates are ISO 8601 date-times (`2026-11-19T14:00:00+01:00`). Give the user's time zone's offset;
  a date alone means midnight UTC, so prefer a full date-time.
- `events.list({ from, to })`: the events overlapping the period. To find "my meetings tomorrow", list
  the day from 00:00 to 23:59.
- `events.create({ title, startsAt, endsAt?, allDay?, description?, category? })`: `category` is a name
  from `categories.list` (an unknown one is refused).
- `events.update({ id, ... })`: only the fields given change; `null` clears `endsAt`, `description` or
  `category`.
- `events.delete({ id })`: for good.
