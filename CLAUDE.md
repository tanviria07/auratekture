# See AGENTS.md

## About this project

Auratekture turns one photo of a room into a styled, ready-to-buy plan. It finds what's missing, picks real products from real stores, shows them in the user's own photo, and pays every store with one signed approval in the Visa Acceptance sandbox.

- `src/`: pages and components (Home, Studio, Diagnostics)
- `base44/`: backend functions and data entities
- API keys live only in Base44 Secrets, never in the code.
- The Aura voice concierge runs as a separate worker: https://github.com/tanviria07/auratekture-aura

Follow the instructions in `AGENTS.md`.