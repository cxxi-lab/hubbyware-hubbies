# Hubby — its API

The demo hubby offers its notes to the other hubbies (and, later, to an AI agent).

## notes.search

Finds notes by their title: `{ "query": "groceries", "limit": 5 }` gives the five most recent notes
whose title contains "groceries". Without `query`, the most recent notes. It only reads.

## notes.create

Adds a note: `{ "title": "Call the plumber" }`. It changes the user's data: an assistant's call is
confirmed first.

## notes.publish

A demo of an action reaching outside Hubbyware: it pretends to publish a note (nothing is sent). An
assistant's call is always confirmed.
