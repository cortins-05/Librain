# Contributing to Librain

Thanks for considering a contribution! Librain is built to be community-friendly: clear structure, modular pipeline, and predictable workflows.

## Ways to contribute

- Report bugs (with reproduction steps)
- Propose features (use cases + acceptance criteria)
- Improve docs (README, guides, examples)
- Add extraction/parsing improvements
- Improve scoring logic & evaluation
- Add tests, refactors, performance improvements

## Development setup

### Prerequisites

- Node.js 20+
- pnpm
- Docker (MongoDB)

### Install & run

```bash
pnpm install
docker compose up -d mongodb
cp .env.template .env
npm run dev
```

## Project conventions

### Branching

- `main` is always releasable
- Use feature branches: `feat/<short-name>` or `fix/<short-name>`

### Commit messages

Use **Conventional Commits**:

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `refactor: ...`
- `test: ...`
- `chore: ...`

Examples:

- `feat: add preference-aware scoring`
- `fix: sanitize url input in /api/task`

### Code style

- Prefer small, focused modules
- Keep functions pure when possible
- Add types for API payloads and DB models
- Avoid duplicated extraction logic — extend the pipeline instead
- Comment “why”, not “what”

### Pull requests

- Keep PRs small and reviewable
- Include screenshots for UI changes
- Describe:
  - What changed
  - Why
  - How to test

## Testing & quality

If the repo includes scripts, prefer running:

```bash
npm run lint
npm run build
```

(If any scripts are missing, feel free to add them in a PR.)
