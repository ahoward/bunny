# FizzBuzz API
A REST API that serves fizzbuzz over HTTP.

## Core Concept

This project exposes the classic fizzbuzz algorithm as an HTTP service. Clients send requests with a number (or range) and receive fizzbuzz results as structured responses.

## Key Design Decisions

- **REST interface** — standard HTTP verbs and status codes
- **Single responsibility** — serves fizzbuzz, nothing more
- **Stateless** — no persistence required; pure computation over HTTP
