# Threat model

## Assets

- TxLINE activated API token and renewable guest JWT.
- Attestor secret key.
- Program upgrade authority and deployment keypair.
- Integrity of Fan Pass/Fan Profile points, streak, inventory, equipped cosmetics and all receipt PDAs.
- Privacy and safety of the ephemeral fan chat.
- Availability of the public fan experience during a live match.
- TxLINE data licence and raw proof confidentiality.

## Trust boundaries

| Boundary | Untrusted input | Validation |
|---|---|---|
| Browser → app API | fixture, moment ID, wallet, replay/live mode | Zod, Solana `PublicKey`, fixed enums, body limit, per-wallet/IP rate limit |
| App API → TxLINE | constructed endpoint paths | internal-only path builder, leading-slash requirement, `://` rejection, network-specific fixed origin |
| TxLINE → normaliser | external JSON schema | type guards, numeric/string coercion, safe defaults, real sequence requirement |
| App server → browser | moment + attestation | source label, canonical signed payload, no raw credential |
| Browser → Solana | all instruction fields | Ed25519 precompile plus exact message reconstruction inside the program |
| Browser → quiz/reward API | wallet, round answers, reward ID | Solana public-key validation, fixed daily round/catalog lookup, rate limit, no client-authored score/cost |
| Browser → fan chat | nickname, team, message | strict length/schema, URL/wagering/secret filters, duplicate-spam suppression, bounded ring buffer |

## Attack paths and controls

### Forge points or badge

An attacker modifies `points` or `badge` in the claim instruction. The program reconstructs the canonical message from submitted values, so it no longer matches the Ed25519-verified message. Points are additionally constrained to `1..100`, badge to `0..63`.

### Substitute TxLINE evidence

The attestation contains `evidenceHash = sha256(source|momentHash|proofDigest)`. Changing the digest changes the signed message. The receipt persists the evidence hash for later audit without publishing the proof payload.

### Claim another wallet's attestation

The signed message includes the wallet public key. `FanPass.has_one(owner)` and the owner signer requirement make the transaction fail for another wallet.

### Replay a valid claim

Receipt PDA seeds are `receipt + owner + momentHash`. The second `init` for the same moment fails atomically.

Quiz and reward receipts use independent `quiz_receipt + owner + quizHash` and `reward_receipt + owner + rewardHash` seeds. Daily check-in additionally compares the Solana-clock UTC day with `last_checkin_day`.

### Inflate streak or point balance

The contract derives the UTC day from `Clock`, calculates the 10–22 point streak award itself and uses checked arithmetic. Quiz points and reward cost are signed by the configured attestor; redemption computes `earned - spent` on-chain before writing either field.

### Redeem or equip a different catalog item

The reward signature commits to catalog digest, kind, stable item index and exact cost. The contract rejects duplicate inventory bits and enforces the deployed catalog's kind/index ranges, so a cheap badge cannot be presented or equipped as a frame/character.

### Abuse fan chat

The route rejects links, betting/casino language, recovery phrases/private keys, repeated text and overlong content. It retains only 50 in-memory messages and exposes no fake users. Residual moderation risk remains because the hackathon deployment has no account reputation or human moderator queue.

### Use a valid signature from another attestor

The contract reads the preceding Ed25519 instruction and compares its 32-byte public key with the key pinned in `PulseConfig`.

### Bypass Ed25519 through instruction offset tricks

Only one signature is accepted. Cross-instruction offsets must all equal `u16::MAX`; signature/public-key/message ranges are bounds-checked; the Ed25519 instruction must immediately precede `claim_moment`.

### Reuse an old or far-future signature

Server attestations expire after five minutes. The program rejects expired signatures and any expiry more than ten minutes ahead of on-chain clock.

### Exhaust the signing endpoint

Body size is capped at 4 KiB and the endpoint accepts ten requests/minute per forwarded-IP + wallet key. TxLINE requests have 15–20 second abort timeouts. JWT refresh is single-flight to avoid a refresh stampede.

### Leak TxLINE credentials

Credentials are server-only variables and never use the `NEXT_PUBLIC_*` prefix. API responses expose transformed moments and proof digests, not tokens or raw proof bodies.

### Silent fallback from live data

Every payload carries `source`. The UI visibly distinguishes `TxLINE live`, `TxLINE historical`, and fallback replay; locally assigned fallback moments have `verified=false`.

## Residual risks before production

1. In-memory rate limiting is per server instance. A multi-instance deployment should use Redis/KV or an API gateway limiter.
2. The attestor is currently a single key. Production should use HSM/KMS signing, rotation monitoring and ideally threshold approval.
3. Contract upgrade authority is a single deployer until moved to a multisig.
4. TxLINE raw payload mapping must be validated with the real activated token before submission.
5. A custom RPC domain must be added to the CSP `connect-src` list.
6. Watch-room votes are local MVP state, not globally persistent or Sybil-resistant.
7. `@solana/web3.js` 1.98.4 still declares Jayson’s older UUID range, so PulseProof pins the nested package to patched `uuid@11.1.1`. Jayson ID generation, a read-only devnet RPC call and the complete application suite pass with this override; `npm audit` reports zero known vulnerabilities.
8. Fan chat is single-instance and ephemeral. A scaled deployment requires managed pub/sub, durable moderation/audit storage, abuse reporting and wallet-signature-based rate tiers.
9. Fan points are intentionally non-transferable and have no cash value; product copy and smart-contract design must continue to avoid wagering, tokenisation or financial reward promises.
