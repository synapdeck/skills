---
name: synapdeck-getting-started
description: Use when an AI agent needs to work with Synapdeck, the collaborative spaced-repetition flashcard platform — explains the core concepts and how to connect to Synapdeck's MCP server to browse decks, notes, and note types, and to create, update, or delete notes.
---

# Getting started with Synapdeck

Synapdeck is a collaborative spaced-repetition flashcard platform. Decks
contain notes; notes are instances of note types, whose templates render
into cards that users review on a spaced-repetition schedule.

## Connect over MCP

Synapdeck exposes its data model through an MCP server:

- **Endpoint:** `https://synapdeck.com/api/mcp` (Streamable HTTP)
- **Authorization:** OAuth 2.1. Discovery metadata is published at
  `https://synapdeck.com/.well-known/oauth-protected-resource`.

After connecting, list the server's tools to see what is available —
browsing decks and notes, reading note types, and inspecting relations
between cards are all exposed as MCP tools.

## Core concepts

- **Note type** — an ordered set of field definitions plus templates that
  render field values into cards.
- **Note** — an instance of a note type, with a value for each field.
- **Card** — a rendered note/template pair; the unit of review.
- **Deck** — a collection of notes, organized into a hierarchy of subdecks.
- **Tracker** — a user's view of a card, carrying scheduling state.
