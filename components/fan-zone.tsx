"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpenCheck,
  CalendarCheck2,
  Check,
  ExternalLink,
  Flame,
  Gift,
  LockKeyhole,
  Pencil,
  Rotate3D,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import type { BrowserWallet } from "@/lib/solana-client";
import {
  fetchFanProfile,
  fetchFanAlias,
  submitDailyCheckIn,
  submitEquipReward,
  submitFanAlias,
  submitQuizClaim,
  submitRewardRedemption,
} from "@/lib/solana-client";
import { REWARD_CATALOG, REWARD_KIND_CODE, rewardIsAvailable } from "@/lib/reward-catalog";
import type {
  FanAlias,
  FanProfile,
  QuizAttestation,
  QuizRound,
  RewardAttestation,
  RewardItem,
} from "@/types/pulse";
import { MASCOT_2026_HERO, MASCOT_2026_SOURCE, MASCOT_HISTORY_SOURCE, WORLD_CUP_MASCOTS } from "@/lib/mascot-archive";
import styles from "./fan-zone.module.css";

type RewardFilter = "all" | "badge" | "medal" | "frame" | "character" | "limited";
type QuizSubmission = {
  day: number;
  score: number;
  points: number;
  results: QuizAttestation["results"];
  attestation: QuizAttestation | null;
};

const utcDay = () => Math.floor(Date.now() / 86_400_000);
const shortKey = (value: string) => `${value.slice(0, 4)}…${value.slice(-4)}`;
const formatUtcClose = (value: string) => `${value.slice(0, 16).replace("T", " · ")} UTC`;

function RewardSprite({ reward, className = "" }: { reward?: RewardItem; className?: string }) {
  if (!reward) return <div className={`${styles.sprite} ${styles.spriteEmpty} ${className}`}><UserRound /></div>;
  const x = ["0%", "50%", "100%"][reward.atlasIndex % 3];
  const y = reward.atlasIndex < 3 ? "0%" : "100%";
  return <div
    aria-label={reward.name}
    className={`${styles.sprite} ${className}`}
    style={{ backgroundImage: `url(${reward.atlas})`, backgroundPosition: `${x} ${y}` }}
  />;
}

export function FanZone() {
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);
  const [walletKey, setWalletKey] = useState("");
  const [profile, setProfile] = useState<FanProfile | null>(null);
  const [alias, setAlias] = useState<FanAlias | null>(null);
  const [aliasDraft, setAliasDraft] = useState("");
  const [editingAlias, setEditingAlias] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [lastSignature, setLastSignature] = useState("");
  const [quiz, setQuiz] = useState<QuizRound | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<QuizSubmission | null>(null);
  const [quizClaimed, setQuizClaimed] = useState(false);
  const [filter, setFilter] = useState<RewardFilter>("all");

  const refreshProfile = useCallback(async (key = walletKey) => {
    if (!key) { setProfile(null); return; }
    const [nextProfile, nextAlias] = await Promise.all([fetchFanProfile(key), fetchFanAlias(key)]);
    setProfile(nextProfile);
    setAlias(nextAlias);
    setAliasDraft(nextAlias?.displayName ?? "");
  }, [walletKey]);

  useEffect(() => {
    fetch("/api/quiz", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Daily quiz is unavailable");
        setQuiz(await response.json() as QuizRound);
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "Daily quiz is unavailable"));
  }, []);

  const connectWallet = async () => {
    try {
      if (wallet && walletKey) {
        await wallet.disconnect();
        setWallet(null); setWalletKey(""); setProfile(null); setAlias(null); setAliasDraft("");
        return;
      }
      const provider = window.solana;
      if (!provider?.isPhantom) throw new Error("Phantom was not detected in this browser");
      const connected = await provider.connect();
      const key = connected.publicKey.toBase58();
      setWallet(provider); setWalletKey(key);
      await refreshProfile(key);
      setNotice("Devnet wallet connected. Phantom will preview every fee before approval.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Wallet connection failed");
    }
  };

  const requireWallet = () => {
    if (!wallet || !walletKey) {
      setNotice("Connect Phantom on devnet before this on-chain action.");
      return false;
    }
    return true;
  };

  const checkIn = async () => {
    if (!requireWallet() || !wallet) return;
    try {
      setBusy("checkin");
      const signature = await submitDailyCheckIn(wallet);
      setLastSignature(signature);
      await refreshProfile();
      setNotice("Daily check-in finalized on Solana devnet. Points and streak now live in your profile PDA.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Check-in transaction failed");
    } finally { setBusy(""); }
  };

  const saveAlias = async () => {
    if (!requireWallet() || !wallet) return;
    const displayName = aliasDraft.replace(/\s+/g, " ").trim();
    if ([...displayName].length < 2 || [...displayName].length > 24 || new TextEncoder().encode(displayName).length > 48) {
      setNotice("Display name must contain 2-24 characters and fit within 48 UTF-8 bytes.");
      return;
    }
    try {
      setBusy("alias");
      const signature = await submitFanAlias(wallet, displayName);
      setLastSignature(signature);
      await refreshProfile();
      setEditingAlias(false);
      setNotice("Display name saved in your Fan Alias PDA. Match chat will verify it against this wallet.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Display name transaction failed");
    } finally { setBusy(""); }
  };

  const loadPractice = async () => {
    try {
      setBusy("practice");
      const response = await fetch(`/api/quiz?mode=practice&seed=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Practice set is unavailable");
      setQuiz(await response.json() as QuizRound);
      setAnswers({}); setQuizResult(null); setQuizClaimed(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Practice set is unavailable");
    } finally { setBusy(""); }
  };

  const submitQuiz = async () => {
    if (!quiz) return;
    if (quiz.mode !== "practice" && !requireWallet()) return;
    if (quiz.questions.some((question) => answers[question.id] === undefined)) {
      setNotice("Choose one answer for all five questions first.");
      return;
    }
    try {
      setBusy("quiz-grade");
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...(walletKey ? { wallet: walletKey } : {}), roundId: quiz.roundId, answers: quiz.questions.map((question) => answers[question.id]) }),
      });
      const body = await response.json() as QuizSubmission & { error?: string };
      if (!response.ok) throw new Error(body.error || "Quiz could not be graded");
      setQuizResult(body);
      setQuizClaimed(false);
      setNotice(body.points ? `Knowledge verified: ${body.score}/${quiz.questions.length}. Claim ${body.points} points on-chain when ready.` : `Practice complete: ${body.score}/${quiz.questions.length}. Review every sourced explanation or load another set.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Quiz could not be graded");
    } finally { setBusy(""); }
  };

  const claimQuiz = async () => {
    if (!quizResult?.attestation || !requireWallet() || !wallet) return;
    try {
      setBusy("quiz-claim");
      const signature = await submitQuizClaim(wallet, quizResult.attestation);
      setLastSignature(signature);
      setQuizClaimed(true);
      await refreshProfile();
      setNotice(`${quizResult.points} quiz points finalized on devnet. The daily round cannot be claimed twice.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Quiz claim failed");
    } finally { setBusy(""); }
  };

  const redeemReward = async (reward: RewardItem) => {
    if (!requireWallet() || !wallet) return;
    if ((profile?.availablePoints ?? 0) < reward.price) {
      setNotice(`You need ${reward.price - (profile?.availablePoints ?? 0)} more points for ${reward.name}.`);
      return;
    }
    try {
      setBusy(`reward-${reward.id}`);
      const response = await fetch("/api/rewards/attest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet: walletKey, rewardId: reward.id }),
      });
      const attestation = await response.json() as RewardAttestation & { error?: string };
      if (!response.ok) throw new Error(attestation.error || "Reward authorization failed");
      const signature = await submitRewardRedemption(wallet, attestation);
      setLastSignature(signature);
      await refreshProfile();
      setNotice(`${reward.name} now belongs to this non-transferable fan profile.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Reward redemption failed");
    } finally { setBusy(""); }
  };

  const equipReward = async (reward: RewardItem) => {
    if (!requireWallet() || !wallet) return;
    try {
      setBusy(`equip-${reward.id}`);
      const signature = await submitEquipReward(wallet, REWARD_KIND_CODE[reward.kind], reward.index);
      setLastSignature(signature);
      await refreshProfile();
      setNotice(`${reward.name} equipped on-chain.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not equip reward");
    } finally { setBusy(""); }
  };

  const filteredRewards = useMemo(() => REWARD_CATALOG.filter((reward) => {
    if (filter === "all") return true;
    if (filter === "limited") return Boolean(reward.availableUntil);
    return reward.kind === filter;
  }), [filter]);
  const owned = new Set(profile?.inventory ?? []);
  const checkedInToday = profile?.lastCheckinDay === utcDay();
  const equippedCharacter = REWARD_CATALOG.find((reward) => reward.index === profile?.equippedCharacter);
  const equippedFrame = REWARD_CATALOG.find((reward) => reward.index === profile?.equippedFrame);
  const equippedBadge = REWARD_CATALOG.find((reward) => reward.index === profile?.equippedBadge);

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.brand}><span><Zap size={17} /></span>PULSE<span>PROOF</span></Link>
      <div className={styles.topActions}>
        <Link href="/" className={styles.back}><ArrowLeft size={15} /> Live center</Link>
        <button className={styles.wallet} onClick={connectWallet}><WalletCards size={16} />{walletKey ? shortKey(walletKey) : "Connect Phantom"}</button>
      </div>
    </header>

    <section className={styles.hero}>
      <div><span>FAN PROGRESSION · DEVNET</span><h1>Knowledge becomes identity—not money.</h1><p>Check in, master sourced World Cup trivia and unlock non-transferable cosmetics. Every point claim and redemption is wallet-approved on Solana devnet.</p></div>
      <div className={styles.guardrail}><ShieldCheck /><div><strong>No betting. No cash value.</strong><span>Points cannot be bought, sold, transferred or converted. SOL is used only for devnet network fees and account rent.</span></div></div>
    </section>

    <section className={styles.profileGrid}>
      <article className={styles.identityCard}>
        <div className={styles.avatarStage}>
          <RewardSprite reward={equippedCharacter} className={styles.avatarCharacter} />
          {equippedFrame && <RewardSprite reward={equippedFrame} className={styles.avatarFrame} />}
          {equippedBadge && <RewardSprite reward={equippedBadge} className={styles.avatarBadge} />}
        </div>
        <div className={styles.identityCopy}>
          <span>ON-CHAIN FAN PROFILE</span>
          {editingAlias ? <div className={styles.aliasEditor}><input aria-label="Display name" autoFocus maxLength={24} value={aliasDraft} onChange={(event) => setAliasDraft(event.target.value)} placeholder="Your fan name" /><button disabled={busy === "alias"} onClick={() => void saveAlias()}>{busy === "alias" ? "Approving…" : "Save on-chain"}</button><button onClick={() => { setEditingAlias(false); setAliasDraft(alias?.displayName ?? ""); }}>Cancel</button></div> : <h2>{alias?.displayName ?? (walletKey ? shortKey(walletKey) : "Guest supporter")} {walletKey && <button className={styles.editAlias} aria-label="Edit display name" onClick={() => setEditingAlias(true)}><Pencil size={14} /></button>}</h2>}
          <p>{profile ? `${profile.inventory.length} cosmetics owned · ${profile.claims} verified actions · ${walletKey ? shortKey(walletKey) : ""}` : "Connect and check in to create your profile PDA."}</p>
        </div>
      </article>
      <article className={styles.balanceCard}><span>AVAILABLE</span><strong>{profile?.availablePoints ?? 0}</strong><b>FAN POINTS</b><small>{profile?.pointsEarned ?? 0} earned · {profile?.pointsSpent ?? 0} redeemed</small></article>
      <article className={styles.statCard}><Flame /><strong>{profile?.currentStreak ?? 0} days</strong><span>Current streak</span><small>Best: {profile?.bestStreak ?? 0}</small></article>
      <article className={styles.statCard}><Trophy /><strong>{profile?.quizClaims ?? 0}</strong><span>Quiz claims</span><small>Each daily round is single-use</small></article>
    </section>

    <section className={styles.checkin}>
      <div className={styles.sectionHead}><div><span>01 · DAILY RITUAL</span><h2>Check in on-chain</h2><p>One claim per UTC day. Consecutive days increase the deterministic bonus up to day seven.</p></div><CalendarCheck2 /></div>
      <div className={styles.checkinFlow}>
        {[1,2,3,4,5,6,7].map((day) => <div key={day} className={profile && day <= Math.min(profile.currentStreak, 7) ? styles.dayActive : ""}><span>DAY {day}</span><strong>+{10 + (day - 1) * 2}</strong><small>PTS</small></div>)}
      </div>
      <button className={styles.primary} onClick={checkIn} disabled={Boolean(busy) || checkedInToday}><CalendarCheck2 size={17} />{busy === "checkin" ? "Waiting for Phantom…" : checkedInToday ? "Checked in today" : "Check in · on-chain"}</button>
      <p className={styles.feeNote}><LockKeyhole size={13} /> Phantom shows the devnet network fee before approval; the first action also creates the profile account.</p>
    </section>

    <section className={styles.twoColumn}>
      <article className={styles.quizCard}>
        <div className={styles.sectionHead}><div><span>02 · WORLD CUP QUIZ ENGINE</span><h2>{quiz?.mode === "practice" ? "Ten-question practice set" : "Five-question daily reward round"}</h2><p>10,000 deterministic variants from source-locked facts. Daily points stay single-use; practice is unlimited and reward-free.</p></div><BookOpenCheck /></div>
        {!quiz ? <div className={styles.loading}>Loading sourced questions…</div> : <>
          <div className={styles.quizMeta}><span>{quiz.edition}</span><b>{quiz.mode === "practice" ? `${quiz.catalogSize?.toLocaleString("en-US")} VARIANTS` : `UP TO ${quiz.maxPoints} PTS`}</b></div>
          <div className={styles.questions}>{quiz.questions.map((question, index) => {
            const result = quizResult?.results.find((item) => item.questionId === question.id);
            return <fieldset key={question.id} className={result ? (result.correct ? styles.correct : styles.wrong) : ""}>
              <legend><b>{String(index + 1).padStart(2, "0")}</b><span>{question.era} · {question.difficulty}</span></legend>
              <h3>{question.prompt}</h3>
              <div className={styles.options}>{question.options.map((option, optionIndex) => <button
                type="button" key={option} disabled={Boolean(quizResult)}
                className={answers[question.id] === optionIndex ? styles.selected : ""}
                onClick={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
              ><i>{String.fromCharCode(65 + optionIndex)}</i>{option}{result?.correctIndex === optionIndex && <Check size={14} />}</button>)}</div>
              <a href={question.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={11} />{question.sourceLabel}</a>
              {result && <p className={styles.explanation}>{result.explanation}</p>}
            </fieldset>;
          })}</div>
          {!quizResult ? <button className={styles.primary} onClick={submitQuiz} disabled={Boolean(busy)}><Sparkles size={17} />{busy === "quiz-grade" ? "Checking sources…" : "Grade my round"}</button> : <div className={styles.quizResult}><div><strong>{quizResult.score}/{quiz.questions.length}</strong><span>{quiz.mode === "practice" ? "practice · no points" : `${quizResult.points} points authorized`}</span></div>{quizResult.attestation && <button onClick={claimQuiz} disabled={Boolean(busy) || quizClaimed}><BadgeCheck size={16} />{quizClaimed ? "Claimed on-chain" : busy === "quiz-claim" ? "Waiting for Phantom…" : "Claim points on-chain"}</button>}<button onClick={() => void loadPractice()} disabled={Boolean(busy)}><Rotate3D size={15} />New practice set</button></div>}
        </>}
      </article>

      <aside className={styles.chatCard}>
        <div className={styles.sectionHead}><div><span>03 · MATCH-BOUND COMMUNITY</span><h2>Chat now lives with the match</h2><p>Each World Cup 2026 fixture has its own SSE room. Posting requires a wallet signature and the on-chain display name above.</p></div><ShieldCheck /></div>
        <div className={styles.chatMoved}><strong>No anonymous impersonation.</strong><span>Read freely; connect Phantom and sign only the message you post. Rooms block links, wagering, wallet secrets and replayed signatures.</span><Link href="/">Open World Cup 2026 live rooms <ArrowLeft size={14} /></Link></div>
      </aside>
    </section>

    <section className={styles.mascotArchive}>
      <div className={styles.sectionHead}><div><span>04 · FIFA-SOURCED MASCOT ARCHIVE</span><h2>The real 2026 trio, plus every mascot era</h2><p>The 2026 visuals below are official FIFA media. Historical entries use a neutral text index—never invented emoji or imitation character art.</p></div><Sparkles /></div>
      <div className={styles.mascotHero}>
        <div className={styles.mascotHeroVisual}><Image src={MASCOT_2026_HERO.image} alt={MASCOT_2026_HERO.alt} width={1265} height={711} priority /></div>
        <div className={styles.mascotHeroCopy}><span>OFFICIAL FIFA WORLD CUP 2026 MASCOTS</span><h3>Clutch · Zayu · Maple</h3><p>Not substitutes and not AI reconstructions: the official bald eagle, jaguar and moose revealed for the United States, Mexico and Canada.</p><div className={styles.mascotRoles}><b>CLUTCH <small>USA · MIDFIELDER</small></b><b>ZAYU <small>MEXICO · STRIKER</small></b><b>MAPLE <small>CANADA · GOALKEEPER</small></b></div><a href={MASCOT_2026_HERO.sourceUrl} target="_blank" rel="noreferrer">Verify on FIFA <ExternalLink size={12} /></a><small className={styles.rightsNote}>Official media © FIFA. Shown for factual identification with source attribution; PulseProof does not claim ownership or affiliation.</small></div>
      </div>
      <div className={styles.mascotRail}>{WORLD_CUP_MASCOTS.map((mascot) => <article key={mascot.id} className={mascot.officialImage ? styles.mascotOfficial : ""}>{mascot.officialImage ? <div className={styles.mascotPhoto}><Image src={mascot.officialImage} alt={`Official FIFA image of ${mascot.name}, ${mascot.form} mascot for ${mascot.host}`} width={720} height={405} /></div> : <div className={styles.mascotSeal} aria-label={`${mascot.category} archive entry`}><span>{mascot.edition}</span><b>{mascot.category}</b></div>}<small>{mascot.edition} · {mascot.host}</small><h3>{mascot.name}</h3><p><strong>{mascot.form}{mascot.role ? ` · ${mascot.role}` : ""}</strong>{mascot.detail}</p><a href={mascot.edition === 2026 ? MASCOT_2026_SOURCE : MASCOT_HISTORY_SOURCE} target="_blank" rel="noreferrer">Official FIFA source <ExternalLink size={11} /></a></article>)}</div>
    </section>

    <section className={styles.store}>
      <div className={styles.sectionHead}><div><span>05 · COSMETIC REWARD VAULT</span><h2>{REWARD_CATALOG.length} non-transferable rewards</h2><p>Badges, medals, avatar frames and original PulseProof characters only. Official World Cup mascots remain a sourced archive above—not claimable or falsely presented as owned collectibles.</p></div><Gift /></div>
      <div className={styles.filters}>{(["all","badge","medal","frame","character","limited"] as RewardFilter[]).map((item) => <button key={item} className={filter === item ? styles.filterActive : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <div className={styles.rewardGrid}>{filteredRewards.map((reward) => {
        const isOwned = owned.has(reward.index);
        const isAvailable = rewardIsAvailable(reward);
        const isEquipped = profile?.equippedBadge === reward.index || profile?.equippedFrame === reward.index || profile?.equippedCharacter === reward.index;
        return <article key={reward.id} className={`${styles.rewardCard} ${styles[reward.rarity]}`}>
          <RewardSprite reward={reward} />
          <div className={styles.rewardCopy}><div><span>{reward.kind}</span><b>{reward.rarity}</b></div><h3>{reward.name}</h3><p>{reward.description}</p>{reward.availableUntil && <small>SEASON CLOSE · {formatUtcClose(reward.availableUntil)}</small>}</div>
          <div className={styles.rewardAction}><strong>{reward.price} PTS</strong>{isOwned ? <button disabled={Boolean(busy) || isEquipped} onClick={() => equipReward(reward)}>{isEquipped ? "Equipped" : busy === `equip-${reward.id}` ? "Approving…" : "Equip on-chain"}</button> : <button disabled={Boolean(busy) || !isAvailable} onClick={() => redeemReward(reward)}>{!isAvailable ? "Closed" : busy === `reward-${reward.id}` ? "Approving…" : "Redeem"}</button>}</div>
        </article>;
      })}</div>
    </section>

    {(notice || lastSignature) && <div className={styles.notice} role="status"><span>{notice || "Latest transaction finalized on Solana devnet."}</span>{lastSignature && <a href={`https://explorer.solana.com/tx/${lastSignature}?cluster=devnet`} target="_blank" rel="noreferrer">Explorer <ExternalLink size={12} /></a>}<button type="button" aria-label="Dismiss notification" onClick={() => { setNotice(""); setLastSignature(""); }}><X size={13} /></button></div>}
    <footer><span>PULSEPROOF FAN ZONE · TXLINE CONSUMER EXPERIENCE</span><span>NON-TRANSFERABLE · NO FINANCIAL REWARDS · DEVNET</span></footer>
  </main>;
}
