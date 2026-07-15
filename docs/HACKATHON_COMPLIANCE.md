# TxODDS Hackathon compliance matrix

Checked against the [official Hackathon Terms](https://txline.txodds.com/documentation/legal/hackathon-terms), [Superteam World Cup brief](https://superteam.fun/earn/hackathon/world-cup/) and incorporated [Superteam Earn Terms of Use](https://superteam.fun/earn/terms-of-use.pdf) on 15 July 2026. This is an engineering compliance record, not legal advice. The Terms may change without notice, so the registered participant must re-check them immediately before submission.

## Submission gates

| Rule area | Terms requirement | PulseProof control/evidence | Participant action still required |
|---|---|---|---|
| Eligibility | Natural person, at least 18, legally eligible, not an excluded TxODDS insider/family member | Cannot be proven by code | Confirm truthfully in the registered account and provide ID if requested |
| Sanctions/jurisdiction | Superteam users must not be subject to listed economic sanctions or use the service where illegal | Cannot be proven by code | Check sanctions and local eligibility truthfully before registration/submission |
| Team | One to three eligible people; designate a leader | Repository assumes one submitting participant | List every real contributor; do not list an AI tool as a teammate |
| Registration | Accurate Superteam registration and deadlines | Public app/repository are ready | Register and submit personally before the deadline |
| Originality | Original work created during the hackathon; pre-existing public components must be attributed | Git/PR history, reproducible tests, `THIRD_PARTY_NOTICES.md` | Preserve the complete development trail; do not backdate or fabricate evidence |
| Human control | Entries must be created, developed and submitted by human participants; materially bot-controlled work may be disqualified | AI use is disclosed in `/compliance` and `docs/HUMAN_AUTHORSHIP_EVIDENCE.md` | Personally review, understand, materially direct, operate and submit the final build; be ready for a live code defence |
| Free judging | Judges must not pay, buy tokens, create a third-party account or establish a wallet | Public replay, Judge Lab, CI, repository and Explorer evidence work without Phantom or SOL | Test the judge path in a clean/incognito browser |
| Blockchain costs | Participant bears wallet, token, transaction and network costs | All writes target devnet; no judge write is required | Keep devnet funded for participant-led demos; never ask judges to fund a wallet |
| Track fit | Functional build/testnet using TxLINE as a primary input | Activated TxLINE server adapter, public transformed SSE, live fixture/scores, stat-validation digest, Solana proof | Demonstrate one real TxLINE path in the video/live review |
| Gambling/law | Comply with applicable gambling and other laws | No odds action, wager, deposit, entry fee, prize pool, transferable reward or pay-to-win mechanic | Do not describe points as money, yield, investment or gambling winnings |
| Privacy | Respect privacy and applicable data-protection law | No product account; local preferences; bounded in-memory chat; public alias/wallet hint explained; rate limits and secret filtering | Do not enter personal data or wallet secrets in chat; add a deletion/contact process before commercial launch |
| Platform conduct | No impersonation, harmful/illegal content, disclosure of another user's identifiable information, security interference or bot-generated account collection | Signed aliases, link/secret/wager moderation, no fake users or account scraping | Keep Superteam profile accurate; never automate registration/submission or scrape participant accounts |
| Third-party IP | Necessary rights/permissions and clear attribution; no FIFA rights are granted | Own PulseProof mark/cosmetics; country flags from MIT package; official mascot images removed; factual source links only; non-affiliation notice | Do not add FIFA logos, tournament marks, trophy art, player likenesses, team crests, kits or copied mascot images without written rights |
| TxODDS IP | No ownership in TxODDS data/API/infrastructure | Product claims no ownership and keeps credentials server-only | Do not publish tokens, raw dumps or claim ownership of TxLINE |
| Data licence | TxODDS data is hackathon-only, ends with the hackathon and may not be redistributed or used to build a competing feed | No raw dataset download; transformed product events only; access guard expires 19 July 2026 23:59:59 UTC; replay remains | Obtain written TxODDS permission before setting `TXLINE_WRITTEN_DATA_LICENSE_EXTENDED=true` |
| Judge materials | Provide credentials, docs, test environment and demo resources at no judge expense | `/submission`, `/compliance`, README, test report, public devnet links | Verify all URLs after the final deploy |
| Publicity/licence | Submission grants TxODDS broad perpetual hackathon-use rights; no confidentiality is promised | Repository and submission assets contain no intended secrets | Submit only material comfortable being public; rotate any leaked credential |
| Prize/tax | At most one prize; wallet, fees, tax, identity and compliance are participant responsibilities | No product control can satisfy this | Supply a compatible prize wallet and obtain tax advice if selected |

## Incorporated Superteam Terms

The stricter hackathon age gate remains 18 even though the general platform terms discuss some minors with guardian consent. Superteam also places responsibility for device/network access, gas, third-party services, taxes and blockchain risk on the user; prohibits impersonation and unauthorised disclosure of another user's identifying information; may terminate accounts for conduct breaches; and uses Singapore law/jurisdiction for platform disputes. The TxODDS Hackathon Terms separately specify English law/courts for hackathon disputes. This engineering record does not resolve a conflict-of-law question; seek qualified legal advice if it matters.

## AI wording conflict

TxODDS's 24 June promotional article says autonomous AI agents may compete, while sections 5.1.6–5.1.7 of the official Hackathon Terms say entries must be created, developed and submitted by natural persons and may disqualify work materially controlled by an autonomous agent. The legal page also says it may be modified and the official Terms govern participation.

PulseProof therefore follows the stricter interpretation:

1. An AI system is not registered as a participant or team member.
2. An AI system does not submit the entry or speak for the participant.
3. AI assistance is disclosed rather than denied.
4. The human participant must materially control product decisions, review and tests.
5. The participant should obtain written clarification from TxODDS/Superteam before submission.

Suggested message:

> I am a registered natural-person participant in Consumer and Fan Experiences. I used AI-assisted development tools under my direction, but I personally defined the product, reviewed and tested the build, control the repository/deployment/wallet, can explain and modify the code, and will submit it myself. Your 24 June article mentions autonomous AI agents, while Hackathon Terms 5.1.6–5.1.7 restrict non-human participation/material control. Please confirm in writing whether disclosed AI-assisted coding is permitted when the human participant retains material control.

Do not change the facts in this message. If any statement is not yet true, complete the corresponding human work first.

## Post-hackathon operating mode

- Before expiry: live TxLINE access may run under the hackathon licence.
- After expiry without written extension: `txLineFetch` fails closed; live SSE returns HTTP 451; labelled public-report replay remains accessible.
- After written extension: the deploy owner may set `TXLINE_WRITTEN_DATA_LICENSE_EXTENDED=true` and archive the written grant.
- The health endpoint exposes the current basis and expiry so judges can see that the boundary is enforced rather than promised only in prose.

## Final manual sign-off

- [ ] I meet the age, jurisdiction and exclusion requirements.
- [ ] Every human team member is listed and the team has no more than three people.
- [ ] I re-read the current Terms and brief on submission day.
- [ ] I completed the authorship protocol in `docs/HUMAN_AUTHORSHIP_EVIDENCE.md`.
- [ ] I tested the public judge path without Phantom, SOL or a paid account.
- [ ] I confirmed there are no copied logos, mascot images, player likenesses, kits or unlicensed media.
- [ ] I verified no secret or raw TxLINE dataset is public.
- [ ] I personally submitted accurate information through my registered account.

Leave boxes unchecked until the registered participant actually performs each action.
