# Threat model

## Assets

- TxLINE activated API token and renewable guest JWT.
- Attestor secret key.
- Program upgrade authority and deployment keypair.
- Integrity of Fan Pass points, badge bitmap and Moment Receipts.
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

## Attack paths and controls

### Forge points or badge

An attacker modifies `points` or `badge` in the claim instruction. The program reconstructs the canonical message from submitted values, so it no longer matches the Ed25519-verified message. Points are additionally constrained to `1..100`, badge to `0..63`.

### Substitute TxLINE evidence

The attestation contains `evidenceHash = sha256(source|momentHash|proofDigest)`. Changing the digest changes the signed message. The receipt persists the evidence hash for later audit without publishing the proof payload.

### Claim another wallet's attestation

The signed message includes the wallet public key. `FanPass.has_one(owner)` and the owner signer requirement make the transaction fail for another wallet.

### Replay a valid claim

Receipt PDA seeds are `receipt + owner + momentHash`. The second `init` for the same moment fails atomically.

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
7. `@solana/web3.js` 1.98.4 retains three moderate npm audit advisories through `jayson/uuid`; no safe supported upgrade is currently offered by npm audit. The affected UUID buffer APIs are not called directly by PulseProof, but the dependency should be re-evaluated before production.
