# Workouts — its API

## timeline.items

The interface of a calendar's dated items (Planner shows them): the sessions between `start` and
`end` (ISO date-times), dated when performed, else when scheduled. Each one's `href` opens it in
Workouts (`/history?session=<id>`). It only reads.
