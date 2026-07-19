# Superteam submission pack

Prepared against the live **Consumer and Fan Experiences** form and brief on 19 July 2026. Replace the two placeholders for YouTube and X, then submit personally from the registered Superteam account before **19 July 2026, 23:59 UTC**.

## Link to Your Submission

```text
https://pulseproof-production-06fa.up.railway.app/submission
```

This is the strongest general link because it gives a judge the product video, live production checks, Explorer evidence, CI and repository from one page.

## Tweet Link

This generic Superteam field is optional. Paste the same public X launch post used later in the track-specific X field, or leave both fields blank. If Superteam asks to verify ownership of the X handle, complete that verification before submitting.

```text
<PASTE_OPTIONAL_X_POST_URL_HERE_OR_LEAVE_BLANK>
```

## Project Title

```text
PulseProof: Every Match Leaves a Memory
```

## Briefly explain your Project

```text
PulseProof is a TxLINE-powered second screen for World Cup fans. It solves the full matchday journey: source-linked upcoming fixtures before kick-off, real-time match context and fixture chat during play, spoiler-safe Catch-up for late fans, and complete replay after full time.

TxLINE is the primary live input. PulseProof normalizes activated devnet fixture, snapshot, historical, validation and stream data into a public SSE experience. A signed Catch-up Capsule commits only the event prefix a fan has already watched, so sharing context never reveals future goals, cards or VAR.

Solana devnet stores non-transferable fan memory and identity. The deployed Anchor program verifies short-lived Ed25519 attestations, creates deterministic anti-replay receipts, and owns daily check-in, quiz claims, reward redemption, equipped cosmetics and Fan Alias state. There are no wagers, deposits, transferable rewards or financial incentives.

The public app, 4:49 product-test video, Judge Room, source code, CI, smart contract and Explorer receipts are all available without requiring a judge to create a wallet or pay any fee.
```

## Link to your live and working MVP

```text
https://pulseproof-production-06fa.up.railway.app
```

## Link to Your Live Demo Video

```text
<PASTE_PUBLIC_YOUTUBE_URL_HERE>
```

Requirements already satisfied by the final file:

- duration: 4:49, below the five-minute limit;
- English male narration and English captions;
- real product UI and Phantom devnet approvals;
- TxLINE Live Center, complete replay, Fan Zone, quiz, reward, chat and Judge Room;
- no private key, seed phrase, API token or personal session content.

The upload title, description, chapters and tags are in [`docs/YOUTUBE.md`](YOUTUBE.md).

## Project's Public Repository Link

```text
https://github.com/cryptovuive/pulseproof
```

## Link to your Project's Technical Documentation

```text
https://github.com/cryptovuive/pulseproof/blob/main/docs/FINAL_REPORT.md
```

## Link to your Project's X Profile or a tweet about it

This field is optional. If you publish a launch post, paste its public URL here:

```text
<PASTE_OPTIONAL_X_POST_URL_HERE_OR_LEAVE_BLANK>
```

## TxLINE API experience

```text
What worked best:

TxLINE's normalized fixture and score model made it possible to build one consumer pipeline for live state, Catch-up and on-chain proof rather than separate adapters for every competition. Stable fixture IDs, sequence values, snapshot/historical endpoints and stat validation were especially useful: PulseProof can turn a visible match moment into a deterministic evidence digest and an anti-replay Solana receipt. The guest JWT plus activated API-token flow was also practical for keeping credentials server-side, while the score stream made a public SSE second screen possible without polling.

Where we hit friction:

Some devnet fixture records supplied participant IDs but omitted competition, round or kick-off metadata. We therefore had to fail closed and enrich only an exact team pair from a separately source-linked World Cup schedule; unmatched fixtures remain unavailable rather than receiving invented context. During completed-match testing, the historical endpoint could be empty while the final snapshot still contained valid source-sequenced on-pitch actions, so the replay pipeline needed a clearly labelled snapshot fallback. A typed browser-streaming example, a compact token/JWT expiry table, and a machine-readable coverage/capability response would reduce integration guesswork for future builders.

Overall, TxLINE gave a small team access to the same live sports primitives normally reserved for large operators, and its sequence-based data model was a strong fit for PulseProof's verifiable fan-memory design.
```

## Anything Else?

```text
Fast judge path:
1. Product: https://pulseproof-production-06fa.up.railway.app
2. Judge Room: https://pulseproof-production-06fa.up.railway.app/submission
3. Fan Zone: https://pulseproof-production-06fa.up.railway.app/fan-zone
4. Runtime health: https://pulseproof-production-06fa.up.railway.app/api/health
5. Devnet program: https://explorer.solana.com/address/74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn?cluster=devnet
6. Verified claim: https://explorer.solana.com/tx/eDCeyqgt7JGn1zbRv3UbWM3NVHnFHNr2TovuAXijQXm2v61GV4at3uavUsX4PUWR6tMtHkk7NQEFhnmtTGMzWnu?cluster=devnet
7. CI: https://github.com/cryptovuive/pulseproof/actions

No wallet, SOL, paid account, token purchase or private credential is required to review the app, replay, Judge Room, CI or Explorer evidence. Live and replay data lanes are explicitly labelled. PulseProof does not expose a downloadable raw TxLINE dataset and contains no wagering or transferable financial rewards.
```

## Final personal checklist

- [ ] Upload `C:\Users\ducth\Downloads\video\PulseProof-Submission-Final-v5.mp4` to YouTube and set visibility to **Public** or **Unlisted**.
- [ ] Enable the uploaded English caption file or verify YouTube captions manually.
- [ ] Replace `<PASTE_PUBLIC_YOUTUBE_URL_HERE>` above.
- [ ] Optionally publish an X post, verify its handle if Superteam requests it, and use the same URL in both optional X fields.
- [ ] Confirm the Superteam profile, Telegram/contact details and team members are accurate.
- [ ] Confirm every human participant is at least 18, eligible in their jurisdiction and the team has no more than three people.
- [ ] Open every submitted URL in a private/incognito window.
- [ ] Re-read the current brief and official Terms.
- [ ] Tick the form confirmation only after checking the scope.
- [ ] Submit personally before 19 July 2026, 23:59 UTC.

Do not leave either placeholder in the actual form.
