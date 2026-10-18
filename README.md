# Auratekture

**One photo of a room in, a styled and ready-to-buy plan out: real products, shown in your own room, paid for with one signed approval.**

[Live app](https://auratekture.base44.app) · [Aura, the voice concierge](https://github.com/tanviria07/auratekture-aura)

## What it does

1. **Snap the room.** Upload one photo of any space: a living room, an event venue, an office.
2. **Say what it's for.** Give the purpose, budget, number of people, ceiling height, when you need it, and what the room already has. Type it, or just tell Aura, the voice concierge.
3. **Get a plan with real products.** Auratekture works out what the room is missing and finds real listings from real stores that fit your budget.
4. **See it in your room.** An AI image of your own photo shows every product in place. Each product has a numbered dot you can click to open it.
5. **Change anything.** Swap an item for a cheaper or different option, and redraw the picture.
6. **Pay safely.** One signed approval checks out across stores through the Visa sandbox, and the agent can't spend more than you approved.

## How it works

| Step | What happens | Built with |
|---|---|---|
| Read the room | Style, colors, what's already there, and anything to be careful with | Gemini (`gemini-4-argon`, falls back to Flash) |
| Plan | 10 to 14 items for the purpose and budget, never re-buying what the room already has | Gemini Flash |
| Shop | Real listings searched in parallel, matched to the plan, wrong categories filtered out, total fitted to the budget | SerpApi Google Shopping + Gemini Flash |
| Picture | The user's own photo, edited to show the chosen products, with product photos as references | Gemini Nano Banana 2.1 |
| Clickable dots | Each product found in the picture and marked with a numbered dot | Gemini Flash object detection |
| Voice | Aura talks the user through the whole flow and drives the page | LiveKit Agents + Synthesia |
| Checkout | Signed approval, verified, then authorized per store | Visa Acceptance sandbox |

## Paying safely with Visa

- **You sign, not the agent.** When you tap **Approve and sign**, your browser signs an Ed25519 approval (WebCrypto) for exactly this basket and spending cap.
- **The agent signs its request.** The checkout agent's request carries RFC 9421 HTTP Message Signatures (`Signature-Input` and `Signature` headers).
- **The server checks both** before calling the Visa Acceptance sandbox (`/pts/v2/payments`, authorization only, no capture), with one authorization per store.
- **Tampering is blocked.** An edited approval returns `403 MANDATE_TAMPER_BLOCKED`, and a bad agent signature returns `401 AGENT_SIGNATURE_INVALID`.

This runs in the sandbox only, with a test card. No real money moves.

## Talking to Aura

Click **Talk to Aura** on the home page and do everything by voice: start a room, describe it, design it, swap products and open checkout. Aura leaves two steps to your own tap: choosing the photo, and signing the approval. Aura can't sign or pay, and it only mentions products, prices and checks that the page shows. The worker code is in [auratekture-aura](https://github.com/tanviria07/auratekture-aura).

## Guardrails

- **Usage limits:** visitors get 3 designs per hour, with 15 per hour overall, so the free API tiers last.
- **Search cache:** product searches are cached for 24 hours.
- **Keys:** every API key lives in Base44 Secrets, never in the code.
- **Diagnostics:** an admin-only page shows API checks and search usage.

## Repo layout

- `src/`: the front end
- `base44/`: backend functions, data entities, shared helpers and app config

## Secrets

The app is built and hosted on [Base44](https://base44.com). Its backend functions read these Secrets:

- `GEMINI_API_KEY`
- `SERPAPI_API_KEY`
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `VISA_MERCHANT_ID`
- `VISA_KEY_ID`
- `VISA_SECRET_KEY`
- `AGENT_SIGNING_PRIVATE_KEY`
- `CREAO_BUYER_API_KEY`
- `CREAO_WEBHOOK_TOKEN`

## Built with

Base44 · Gemini · SerpApi · Visa Acceptance · LiveKit · Synthesia

Built solo for LA Hacks.
