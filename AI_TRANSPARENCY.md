# AI Transparency (Providers, Models, and Data)

This project was built during HackUDC with a **multi-provider AI approach**:
- **Local-first**: Open-source models via **Ollama (Docker)**
- Optional cloud providers: **Gemini** and **ChatGPT (OpenAI)**

The goal is to keep the AI layer **modular** and make it possible to run the project without relying solely on closed-source APIs.

---

## Providers

### Ollama (Open Source / Local)
- Runs models locally (no external API required)
- Recommended for the “Best Use of Open Source AI” track
- Typical models used via Ollama are configurable (examples: `phi3`, `llama3`, `mistral`)

> Note: exact models may vary by contributor and hardware. The repository should document the default model used in `docker-compose` or env config if you standardize it.

### Gemini (Google)
- Used as a cloud AI provider option for metadata and assistant responses (depending on configuration)

### ChatGPT (OpenAI)
- Used as a cloud AI provider option (depending on configuration)

---

## Data handling

- The app stores **only extracted text** from user inputs, not the original file binary.
- Extracted text is sent to the configured AI provider(s) to generate:
  - title/name
  - state
  - score
  - short summary
- No fine-tuning is performed as part of this hackathon build.

---

## Local Ollama (Docker) — recommended setup

If you want a local-first run, start Ollama in Docker and point the app to it.

Minimal example (adapt as needed):

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama:/root/.ollama
volumes:
  ollama:
```

Then configure the app to use the Ollama endpoint (example):
- `OLLAMA_BASE_URL=http://localhost:11434`

> If your code uses a different variable name or adapter, document it here.
