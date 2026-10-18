# Auratekture

**One photo of a room in, a styled and ready-to-buy plan out: real products, shown in your own room, paid for with one signed approval.**

[Live app](https://auratekture.base44.app) · [Aura, the voice concierge](https://github.com/tanviria07/auratekture-aura)

## Try it (3 minutes)

Open [auratekture.base44.app](https://auratekture.base44.app) on a laptop with a microphone.

1. **Start by voice.** Click **Talk to Aura** and say "New room." Tap the glowing upload button and pick a photo of any room.
2. **Tell Aura about it.** She says what she noticed, then asks what the room is for. Answer in one go, for example: "A hackathon judging expo, 300 dollars, 40 people, about 12-foot ceilings." Then say when you need it and what's already there: "By Friday. The venue already has tables, chairs and Wi-Fi." She reads the brief back. Say "Yes."
3. **See it in your room.** The products appear first, then your own photo with every product placed in it. Tap a number to open the real listing. Warnings tell you what could go wrong, such as decor near a fireplace or an item that might arrive late.
4. **Change anything.** Ask for a cheaper or different item, or tap **Swap**.
5. **Pay once.** Say "I'm ready to check out." Read what you're signing: the cap, the items, the stores, valid for 15 minutes, usable once. Then tap **Approve and sign** yourself. Aura can't sign for you.
6. **Check the receipt.** There's one row per store, each with Visa's sandbox transaction ID and the checks that store ran before Visa was called.
7. **Try to break it.** Under **Trust check**, press all three: change a price after signing, tamper with the request, and replay an old payment. Each one is blocked before it reaches Visa.

Everything also works by clicking, without voice. Payments run in the Visa Acceptance sandbox with a test card, so no real money moves. The stores are simulated: their payments run through one sandbox merchant account, labeled with each store's name.

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

- **You sign, not the agent.** When you tap **Approve and sign**, your browser signs an Ed25519 approval (WebCrypto) for exactly this basket: the items, prices, stores and a spending cap, valid for 15 minutes and usable once.
- **The agent proves who it is.** Each store's payment request is signed by the agent, built to Visa's Trusted Agent Protocol spec: RFC 9421 HTTP Message Signatures with tag `agent-payer-auth`, `created` and `expires` (8-minute window), a one-time `nonce`, and a `keyid` published in a public key directory.
- **Every store checks before Visa is called.** The store-side verifier runs the spec's steps in order (tag, required fields, time window, replay, key lookup, signature). Then it checks that the request matches what you signed. The results appear under each store on the receipt.
- **Then Visa authorizes.** The Visa Acceptance sandbox (`/pts/v2/payments`) runs an authorization only, one per store. Retries are safe: each store is recorded before Visa is called, and a timed-out payment is looked up with Visa's transaction search before it's ever retried.
- **Tampering is blocked.** `403 MANDATE_TAMPER_BLOCKED` when a price changes after signing, `401 AGENT_SIGNATURE_INVALID` when the request is altered, and `401 NONCE_REPLAYED` when an old request is resent.
- **Trust receipt.** Download a JSON receipt with every item, why it was chosen, its checks, the signed approval, the signatures, each store's checks and Visa's transaction IDs.

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

## Built at LA Hacks

Auratekture was built solo during LA Hacks. The first commit in this repo ("Initial commit") is Base44's starter template (build config and Base44's default starter files), and none of Auratekture's code. Work on the project began on October 17, 2026 at 5:00 PM Pacific time, and every commit since then is hackathon work. The voice concierge has its own repo, [auratekture-aura](https://github.com/tanviria07/auratekture-aura).

## Built with

Base44 · Gemini · SerpApi · Visa Acceptance · LiveKit · Synthesia

Built solo for LA Hacks.