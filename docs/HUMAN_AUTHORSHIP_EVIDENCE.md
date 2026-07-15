# Human authorship and AI-assistance record

This document is a defence protocol, not a pre-written claim of sole manual authorship. PulseProof used AI-assisted tools for research organisation, code drafting, implementation support and testing support. The participant must not tell judges that no AI was used.

The relevant legal question is whether the registered human participant created, developed and submitted the entry and retained material control—not whether every character was typed without tooling.

## Human product decisions already visible in the build process

The participant supplied and repeatedly refined the core requirements, including:

- a real-time TxLINE World Cup second screen rather than a betting product;
- accurate team flags/codes and removal of unrelated or eliminated-team fixtures;
- finished-match replay with goals, cards, VAR and substitutions matching the live view;
- wallet-shared Live Center/Fan Zone sessions and participant-approved Phantom transactions;
- daily on-chain check-in, quiz points and non-transferable cosmetic identity;
- fixture-scoped signed chat instead of a disconnected global chat;
- removal of jerseys, emoji mascots and later unlicensed official mascot artwork;
- explicit focus on source accuracy, adversarial tests and no invented data.

Preserve the complete conversation/export if asked. Do not cherry-pick messages to hide the level of AI assistance.

## Evidence hierarchy

Strong evidence:

1. A live, unassisted architecture explanation tied to actual files and transactions.
2. Reproducing install, tests and build from a clean clone.
3. Diagnosing a seeded fault or implementing a small change live.
4. Explaining the product decision log and trade-offs in the participant's own words.
5. Personally controlling Superteam registration, GitHub, Railway, TxLINE subscription and the devnet wallet.

Supporting but insufficient evidence on its own:

- Git commits or a repository under the participant's username;
- an on-chain wallet signature;
- AI-generated documentation claiming human control;
- a polished demo video;
- test counts without understanding what the tests protect.

## Required personal verification session

Record one continuous, uncut screen-and-voice session before submission:

1. Show the registered Superteam profile and public repository without exposing secrets.
2. Clone the repository into a clean directory, install dependencies, run `npm test`, `npm run lint`, and `npm run build`.
3. Open `lib/txline.ts` and explain authentication, schema normalisation, source labelling and the data-licence guard.
4. Open `app/api/stream/route.ts` and explain snapshot, deduplication, heartbeat, reconnect and replay separation.
5. Open `programs/pulseproof/src/lib.rs` and explain the Ed25519 preceding-instruction rule, PDA receipts and replay rejection.
6. Open the public app, complete the no-wallet Judge Lab, then show an existing devnet transaction in Explorer.
7. Make one small real change chosen by the human participant, add a targeted test, run the suite and open a human-authored PR explaining the reason.
8. State the AI disclosure exactly and answer: what did AI assist with, what did the human decide, what failures did the human catch, and what would the human change next?

Keep this recording private unless an organiser requests authorship verification. Do not edit it in a way that suggests actions occurred that did not occur.

## Ninety-second response if challenged

Use only statements that are true:

> PulseProof is an AI-assisted project, and I am not claiming otherwise. I am the registered human participant: I defined and repeatedly changed the product requirements, control the repository, deployment, TxLINE subscription and devnet wallet, personally approved the wallet actions, and I will submit the entry myself. I can explain the TxLINE-to-SSE-to-attestation-to-Solana flow, reproduce the tests from a clean clone and make a requested change live. Here are the decision trail, CI, public deployment and on-chain receipts. I understand the Terms prohibit a bot from participating or materially controlling the submission, so I am asking you to evaluate my actual human control and technical understanding rather than a claim that no development tool was used.

Do not use this response until every factual statement in it is personally verified.

## Questions the participant must answer without assistance

- Why does PulseProof need Solana instead of a normal database?
- Which events are truly TxLINE-derived and which are published-report replay?
- Why are local replay sequence IDs never marked TxLINE-verified?
- How does a Catch-up Capsule prevent future spoilers from entering its payload?
- Why must the Ed25519 verification instruction immediately precede the claim instruction?
- How do receipt PDAs stop replay and duplicate point claims?
- Why can judges evaluate the product without Phantom or SOL?
- What data stops flowing after the hackathon licence expires?
- Which third-party assets were removed and why?
- What part of the product would you redesign with another week?

If any answer is unclear, study and rehearse it before submission. A document cannot substitute for understanding.
