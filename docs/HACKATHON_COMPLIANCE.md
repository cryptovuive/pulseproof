# TxODDS Hackathon compliance matrix

Checked on 19 July 2026 against the [Consumer and Fan Experiences brief](https://superteam.fun/earn/listing/consumer-and-fan-experiences), [official Hackathon Terms](https://txline.txodds.com/documentation/legal/hackathon-terms) and [Superteam Earn Terms](https://superteam.fun/earn/terms-of-use.pdf). This is an engineering record, not legal advice. The registered participant must review the current documents before submission because the sponsor may update them.

## Submission and product controls

| Rule area | Requirement | PulseProof evidence | Participant action |
|---|---|---|---|
| Deadline | Submit by 19 July 2026, 23:59 UTC | Final package and form copy are ready | Submit personally before the deadline |
| Eligibility | Natural person, at least 18, legally eligible and not an excluded TxODDS insider or household/family member | Cannot be proven by code | Confirm every statement truthfully and complete identity checks if requested |
| Team | Individual or team of no more than three eligible people with one leader | Repository is prepared for one submitting owner | List every real participant and correct contact details |
| Registration | Accurate Superteam registration | Public materials use the `cryptovuive` repository | Use the participant's own registered account |
| Originality | Original work created during the hackathon; public pre-existing components properly attributed | Development history, scoped PRs, tests and `THIRD_PARTY_NOTICES.md` | Do not claim work or rights that the participant does not own |
| Functional product | Live mainnet/devnet product, not slides or a mock-up | Railway app, Judge Room, Solana program, Explorer receipts and CI | Verify public URLs in a private browser |
| TxLINE live input | TxLINE must actively power the product | Activated devnet subscription, fixture/snapshot/history/validation/stream adapter and public SSE | Keep credentials server-side and demonstrate the path accurately |
| Solana sign-up | Access is activated through Solana | Public subscription transaction and deployed devnet program | Keep the participant wallet and upgrade authority secure |
| Demo | Public video up to five minutes showing problem, walkthrough and TxLINE backend | 4:49 final product test with English narration/captions | Upload publicly or unlisted and paste the URL |
| Public repo | Include a public source repository | `https://github.com/cryptovuive/pulseproof` | Keep the repository public through judging |
| Technical documentation | Explain idea, business/technical highlights and endpoints | `README.md`, `docs/FINAL_REPORT.md`, architecture and deployment guide | Paste the technical-report URL in the form |
| TxLINE feedback | State what worked and where friction occurred | Submission-ready factual feedback in `docs/SUBMISSION.md` | Review it and submit only if it matches the participant's experience |
| Free judging | Judges must not pay, buy assets, create a wallet/account or purchase a third-party service | Replay, Judge Room, repository, CI and Explorer evidence work without Phantom or SOL | Do not ask judges to fund a wallet; lead with the no-wallet path |
| Blockchain costs | Participant bears transaction, wallet and network costs | All product writes target devnet; judge writes are optional | Maintain any devnet resources needed for a participant-led demo |
| Human submission | Entry must be owned, controlled and submitted by an eligible natural person | Accounts and public infrastructure remain under participant control | Understand the product, operate it and answer questions truthfully |
| Gambling and law | Comply with gambling, gaming, consumer, financial and local laws | No wagers, deposits, entry fees, prize pools, odds actions, transferable rewards or pay-to-win loop | Never describe points as money, investment return or winnings |
| Privacy | Respect users and applicable data-protection law | Local-first preferences, bounded chat, secret moderation and rate limits | Do not enter personal data or wallet secrets; add formal deletion/contact processes before commercial scale |
| Third-party IP | Hold rights and attribute third-party code/assets; no FIFA rights are granted | Original mark/rewards, package notices, country flags and explicit media exclusions | Do not add logos, crests, kits, player likenesses or mascot art without rights |
| TxODDS data | Hackathon-only licence; no redistribution, sublicense, sale or competing feed | No raw download; transformed UI and digest; live-access expiry guard | Obtain written permission before any post-window live use |
| Publicity and licence | TxODDS receives the submission licence stated in the Terms; submissions are not confidential | Public repo and demo contain no intended secrets | Submit only material the participant is comfortable making public |
| Prize/KYC/tax | Winner must provide compatible payment details and may need identity/tax checks | Not satisfiable in product code | Supply accurate information and obtain professional advice if needed |

## Data-licence operating mode

- During the published access window, live TxLINE calls use the activated server token.
- After `2026-07-19T23:59:59Z`, the adapter fails closed unless `TXLINE_WRITTEN_DATA_LICENSE_EXTENDED=true` is backed by written TxODDS permission.
- Labelled public-report replay remains available because it is not represented as a raw TxLINE dataset.
- `/api/health` exposes the current basis and expiry so the boundary is testable.

## IP and brand boundary

- TxLINE data, APIs, software, methodology and infrastructure remain TxODDS property.
- PulseProof does not imply sponsorship, endorsement or affiliation with FIFA or a tournament organiser.
- No official FIFA/tournament logo, trophy art, mascot art, team crest, player photograph/likeness or kit art is bundled.
- Factual match/team references identify the subject of source-linked records only.
- Direct runtime packages and their licences are listed in `THIRD_PARTY_NOTICES.md`.

## Free judge path

1. Open the 4:49 public demo.
2. Open the deployed product and a finished replay.
3. Run the eight Judge Room checks.
4. Inspect GitHub CI and the public devnet program/transactions.
5. Use Phantom only if the judge voluntarily wants to repeat a devnet write; it is not required for evaluation.

## Final manual sign-off

- [ ] I meet the age, jurisdiction and exclusion requirements.
- [ ] Every human team member is listed and the team has no more than three people.
- [ ] My Superteam profile and contact information are accurate.
- [ ] I re-read the current brief and official Terms on submission day.
- [ ] I understand the problem, architecture, TxLINE integration, contract and security controls.
- [ ] I tested the public judge path without Phantom, SOL or a paid account.
- [ ] I confirmed there are no copied logos, mascot images, player likenesses, kits or unlicensed media.
- [ ] I verified no secret, wallet key or raw TxLINE dataset is public.
- [ ] I uploaded a public/unlisted video shorter than five minutes.
- [ ] I personally submitted accurate information before the deadline.

Leave boxes unchecked until the registered participant actually performs each action.
