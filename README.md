# Flowsheets v2

A research prototype programming environment for making programs while seeing the data the program outputs. See the **[10 minute demo video](https://www.youtube.com/watch?v=y1Ca5czOY7Q)** for details and **[sign up for the newsletter](https://tinyletter.com/Flowsheets)**.

This is a Vue 3 rewrite of the original Flowsheets v2.

## Setup

```bash
docker compose up --build
```

Visit http://localhost:5173.

## Development

```bash
# Start (after initial build)
docker compose up

# Run tests
docker exec flowsheets npx vitest run

# Install packages
docker exec flowsheets npm install <package>
```
