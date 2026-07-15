# Deployment checklist

## Verified release evidence — 13 July 2026

- TxLINE devnet subscription transaction: `54TvjbxjP41cBP4BebWWyoJNWex6evuwapHcYb9hWziErFkvpfFPgTkU9bc2K9iGUnXojEWiNHS1wUTiktiMXgbC`
- PulseProof program: `74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn`
- Deploy transaction: `4z4ihcYmRc6rTv9hFB7D4yAvxqgPBMLubVYB954MfVBoiYijZ4CUwB7vPSEfgaRLWAuyH6avZvP519gvT4ceNdS`
- Config PDA: `EYPyczHs8sUeomTJUkzqKXjYQEx5tqeFAXtMFVF6zx9f`
- Initialize transaction: `3PeE9suRvD3XUi5j7GNERqYVAd7dyGHmEjy9DWmkpBwJZnTwV1ozdUXKz45Y21f9qT6WbMFRJdqSQvvruPFgr2MB`
- Fan Pass PDA: `ChThJ7HmSMxAk1xkbQCHhKpQYURLc94kZ5ZBEAroNMhH`
- Receipt PDA: `CSKjHnzNBTujs6TFqtkLoBTMLWuStEjjb9L6Kk81E5we`
- Claim transaction: `vid5hzmuF2FJnzFvZa7251fLdh5d5eRrn4WyvPd85WVKAcnccBbJhKEUFXx5VAXgvBEYp9bjZcToSp5yfnJHHCR`

All addresses and signatures are public devnet evidence. Wallet, TxLINE token, attestor secret and program keypair remain local/hosting secrets.

Public web release: `https://pulseproof-production-06fa.up.railway.app` on Railway project `poetic-growth`. The service uses `Dockerfile` + `railway.json`, `/api/health` as its deploy healthcheck, and server-only secret variables.

## 1. Activate TxLINE on one network

Follow the official World Cup free-tier guide. Keep RPC, TxLINE program, API host, wallet and activation transaction on the same network.

- Mainnet: level `1` is 60-second delay; level `12` is real-time.
- Devnet: use the currently enabled free row and confirm its on-chain sampling interval.
- Free access still needs SOL for transaction fees/account rent.

Store only the activated API token as `TXLINE_API_TOKEN`. The application can refresh the guest JWT itself.

## 2. Generate an attestor key

Run locally and copy the base58 secret directly into your deployment secret manager; never commit or paste it into chat/support:

```bash
node -e "const nacl=require('tweetnacl');const bs58=require('bs58').default;console.log(bs58.encode(nacl.sign.keyPair().secretKey))"
```

## 3. Solana/Anchor toolchain

This workspace was verified in WSL2 with Rust 1.97.0, Solana CLI 2.3.0 and Anchor 0.32.1. `anchor build` succeeds and generates the SBF binary, IDL and TypeScript types under the ignored `target/` directory. Reproduce it in WSL2/Linux or a Solana-ready CI runner:

```bash
rustc --version
solana --version
anchor --version
anchor build
```

When the local WSL VM is unavailable, run the manual **Reproducible SBF build** GitHub workflow. It builds inside the digest-pinned official `solanafoundation/anchor:v0.32.1` image and publishes only the `.so`, its SHA-256 digest and the public IDL for one day. Wallet and program keypair files are never uploaded; deployment must still be signed locally by the existing upgrade authority.

The catalog-parity release was reproduced by [workflow run 29336473514](https://github.com/cryptovuive/pulseproof/actions/runs/29336473514). It produced a 409,544-byte `pulseproof.so` with SHA-256 `7701a26b1d713496e92144915ade70619a13aa9acc4eb50a4702c0e11cb039c8`. After deployment, the first 409,544 program bytes read from ProgramData matched that artifact byte-for-byte. The upgrade finalized at slot `476217190` in transaction `5PLxviYFgxBLvfgB5pgmRzvvDzoxkh7sMVZtgCyZBeTCiQBr7jAXS4RLwwc956bckVJvG5fcxvwCsQBPjGHnXqmM` without changing the program address or upgrade authority.

The current local build generated program address `74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn` and synced it across the source/config. The ignored `target/deploy/pulseproof-keypair.json` is required to deploy at that address. If that local key is unavailable, generate a new one and sync IDs before first deploy:

```bash
anchor keys sync
```

After sync, update all three places with the new ID:

- `declare_id!` in `programs/pulseproof/src/lib.rs`
- `[programs.devnet]` in `Anchor.toml`
- `NEXT_PUBLIC_PULSEPROOF_PROGRAM_ID` in the web deployment

Then deploy:

```bash
solana config set --url devnet
solana airdrop 2
anchor build
anchor deploy --provider.cluster devnet
```

After a catalog-contract upgrade, run the public rejection probe with the disposable authority wallet:

```bash
ANCHOR_WALLET=.local-wallets/phantom-test-wallet.json npm run contract:retired:devnet
```

The probe intentionally records a failed `equip_reward` transaction for retired index `36` and requires the chain to return `InvalidRewardIndex` / custom error `6016`. The catalog-parity release proof is transaction `3Zx3iHCake4e8Ycr7pF656GjgawKNpH4CwrBTmXpKpH2RtNaBNK9F4s7MvWXNT9UGHKeiop8dSToaeTgD73mg7xi`.

## 4. Initialise the contract

Provide `ANCHOR_WALLET`, the program/RPC variables and the same attestor secret used by the API:

```bash
npm run contract:init
```

Record the config PDA, attestor public key and transaction signature in the submission docs.

## 5. Deploy the web service

Required production environment:

```dotenv
TXLINE_NETWORK=devnet
TXLINE_API_TOKEN=...
ATTESTOR_SECRET_KEY=...
DEMO_REPLAY_ENABLED=true
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
TXLINE_WRITTEN_DATA_LICENSE_EXTENDED=false
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PULSEPROOF_PROGRAM_ID=...
```

Build/start:

```bash
npm ci
npm run build
npm start
```

The hosting platform must support long-lived streaming responses. If it buffers or terminates SSE, keep the same UI but switch the client to poll `/api/matches/{fixtureId}` every three seconds.

The Railway release was externally verified with a 20-second streaming request: HTTP `200`, `Content-Type: text/event-stream`, `X-Accel-Buffering: no`, followed by `ready`, `pulse` and a 15-second `heartbeat` while the connection remained open.

## 6. Release verification

1. `/api/health` reports correct network and `credentialsConfigured: true`.
2. `/api/matches` returns a covered TxLINE fixture.
3. Score/timeline changes during a live fixture or historical records load for a completed fixture.
4. Browser source contains no API token or attestor secret.
5. Phantom connects on the same Solana network.
6. First claim creates Fan Pass + receipt; second claim of same moment fails.
7. Wrong wallet, altered points and expired signatures fail.
8. Incognito judge flow works without wallet/payment.
9. Mobile width 375px has no horizontal overflow.
10. Repository is public and contains no `.env.local`, wallet JSON or target deploy keys.
