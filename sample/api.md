# Hubby — its API

The demo hubby offers its notes to the other hubbies (and, later, to an AI agent).

## notes.search

Finds notes by their title: `{ "query": "groceries", "limit": 5 }` gives the five most recent notes
whose title contains "groceries". Without `query`, the most recent notes. It only reads.
