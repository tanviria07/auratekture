# See AGENTS.md

## About this project

Auratekture turns a photo of any room into a plan you can buy: upload a photo, describe the room, and get an AI-planned setup of real products with a signed, Visa-verified checkout and the Aura voice concierge.

- `src/`: pages and components (frontend)
- `base44/`: backend functions, entities, and shared backend code
- API keys live only in the app's Secrets, never in code or `.env` files committed to the repo
- The Aura voice worker lives at github.com/tanviria07/auratekture-aura

Follow the instructions in `AGENTS.md`.