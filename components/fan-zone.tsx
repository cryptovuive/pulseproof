"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
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
  MessageCircle,
  Radio,
  Send,
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
  submitDailyCheckIn,
  submitEquipReward,
  submitQuizClaim,
  submitRewardRedemption,
} from "@/lib/solana-client";
import { REWARD_CATALOG, REWARD_KIND_CODE, rewardIsAvailable } from "@/lib/reward-catalog";
import type {
  CommunityMessage,
  FanProfile,
  QuizAttestation,
  QuizRound,
  RewardAttestation,
  RewardItem,
} from "@/types/pulse";
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
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [lastSignature, setLastSignature] = useState("");
  const [quiz, setQuiz] = useState<QuizRound | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<QuizSubmission | null>(null);
  const [quizClaimed, setQuizClaimed] = useState(false);
  const [filter, setFilter] = useState<RewardFilter>("all");
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [online, setOnline] = useState(0);
  const [chatStatus, setChatStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [nickname, setNickname] = useState("Fan");
  const [team, setTeam] = useState("");
  const [chatBody, setChatBody] = useState("");

  const refreshProfile = useCallback(async (key = walletKey) => {
    if (!key) { setProfile(null); return; }
    setProfile(await fetchFanProfile(key));
  }, [walletKey]);

  useEffect(() => {
    fetch("/api/quiz", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Daily quiz is unavailable");
        setQuiz(await response.json() as QuizRound);
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "Daily quiz is unavailable"));
    const storageTimer = window.setTimeout(() => {
      try {
        setNickname(localStorage.getItem("pulseproof-chat-name") || "Fan");
        setTeam(localStorage.getItem("pulseproof-chat-team") || "");
      } catch { /* storage is optional */ }
    }, 0);
    return () => window.clearTimeout(storageTimer);
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/community/chat");
    source.addEventListener("ready", () => setChatStatus("live"));
    source.addEventListener("history", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { messages: CommunityMessage[] };
      setMessages(payload.messages);
    });
    source.addEventListener("message", (event) => {
      const message = JSON.parse((event as MessageEvent).data) as CommunityMessage;
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current.slice(-49), message]);
    });
    source.addEventListener("presence", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { online: number };
      setOnline(payload.online);
    });
    source.onerror = () => setChatStatus("offline");
    return () => source.close();
  }, []);

  const connectWallet = async () => {
    try {
      if (wallet && walletKey) {
        await wallet.disconnect();
        setWallet(null); setWalletKey(""); setProfile(null);
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

  const submitQuiz = async () => {
    if (!quiz) return;
    if (!requireWallet()) return;
    if (quiz.questions.some((question) => answers[question.id] === undefined)) {
      setNotice("Choose one answer for all five questions first.");
      return;
    }
    try {
      setBusy("quiz-grade");
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet: walletKey, roundId: quiz.roundId, answers: quiz.questions.map((question) => answers[question.id]) }),
      });
      const body = await response.json() as QuizSubmission & { error?: string };
      if (!response.ok) throw new Error(body.error || "Quiz could not be graded");
      setQuizResult(body);
      setQuizClaimed(false);
      setNotice(body.points ? `Knowledge verified: ${body.score}/5. Claim ${body.points} points on-chain when ready.` : "Round complete. Review the sourced explanations and try again tomorrow.");
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

  const sendChat = async (event: FormEvent) => {
    event.preventDefault();
    if (!chatBody.trim()) return;
    try {
      setBusy("chat");
      const response = await fetch("/api/community/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname, team: team || undefined, body: chatBody, walletHint: walletKey ? shortKey(walletKey) : undefined }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Message could not be sent");
      setChatBody("");
      try {
        localStorage.setItem("pulseproof-chat-name", nickname);
        localStorage.setItem("pulseproof-chat-team", team);
      } catch { /* storage is optional */ }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Message could not be sent");
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
        <div className={styles.identityCopy}><span>ON-CHAIN FAN PROFILE</span><h2>{walletKey ? shortKey(walletKey) : "Guest supporter"}</h2><p>{profile ? `${profile.inventory.length} cosmetics owned · ${profile.claims} verified actions` : "Connect and check in to create your profile PDA."}</p></div>
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
        <div className={styles.sectionHead}><div><span>02 · DAILY WORLD CUP QUIZ</span><h2>Five sourced questions</h2><p>Two or four choices. Answers remain server-side until the round is graded.</p></div><BookOpenCheck /></div>
        {!quiz ? <div className={styles.loading}>Loading sourced questions…</div> : <>
          <div className={styles.quizMeta}><span>{quiz.edition}</span><b>UP TO {quiz.maxPoints} PTS</b></div>
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
          {!quizResult ? <button className={styles.primary} onClick={submitQuiz} disabled={Boolean(busy)}><Sparkles size={17} />{busy === "quiz-grade" ? "Checking sources…" : "Grade my round"}</button> : <div className={styles.quizResult}><div><strong>{quizResult.score}/5</strong><span>{quizResult.points} points authorized</span></div>{quizResult.attestation && <button onClick={claimQuiz} disabled={Boolean(busy) || quizClaimed}><BadgeCheck size={16} />{quizClaimed ? "Claimed on-chain" : busy === "quiz-claim" ? "Waiting for Phantom…" : "Claim points on-chain"}</button>}</div>}
        </>}
      </article>

      <aside className={styles.chatCard}>
        <div className={styles.sectionHead}><div><span>03 · LIVE FAN CHAT</span><h2>Matchday commons</h2><p>Ephemeral community chat. No fabricated users or seeded messages.</p></div><MessageCircle /></div>
        <div className={styles.chatPresence}><span className={chatStatus === "live" ? styles.onlineDot : styles.offlineDot} />{chatStatus === "live" ? `${online} connected now` : chatStatus}<b>NO LINKS · NO BETTING</b></div>
        <div className={styles.chatLog}>{messages.length ? messages.map((message) => <article key={message.id}>
          <div><strong>{message.nickname}</strong>{message.team && <span>{message.team}</span>}<small>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div>
          <p>{message.body}</p>{message.walletHint && <code>{message.walletHint}</code>}
        </article>) : <div className={styles.chatEmpty}><Radio /><strong>The room is quiet.</strong><span>Be the first real fan to start the conversation.</span></div>}</div>
        <form className={styles.chatForm} onSubmit={sendChat}>
          <div><input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={24} aria-label="Chat nickname" /><input value={team} onChange={(event) => setTeam(event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))} placeholder="TEAM" maxLength={3} aria-label="Team code" /></div>
          <textarea value={chatBody} onChange={(event) => setChatBody(event.target.value)} maxLength={280} placeholder="Talk football, not finances…" aria-label="Chat message" />
          <button disabled={busy === "chat" || chatStatus !== "live"}><Send size={15} />Send live</button>
        </form>
      </aside>
    </section>

    <section className={styles.store}>
      <div className={styles.sectionHead}><div><span>04 · COSMETIC VAULT</span><h2>36 original rewards</h2><p>Badge, medal, frame and character inventory is a non-transferable bitset inside the fan profile PDA.</p></div><Gift /></div>
      <div className={styles.filters}>{(["all","badge","medal","frame","character","limited"] as RewardFilter[]).map((item) => <button key={item} className={filter === item ? styles.filterActive : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <div className={styles.rewardGrid}>{filteredRewards.map((reward) => {
        const isOwned = owned.has(reward.index);
        const isAvailable = rewardIsAvailable(reward);
        const isEquipped = profile?.equippedBadge === reward.index || profile?.equippedFrame === reward.index || profile?.equippedCharacter === reward.index;
        return <article key={reward.id} className={`${styles.rewardCard} ${styles[reward.rarity]}`}>
          <RewardSprite reward={reward} />
          <div className={styles.rewardCopy}><div><span>{reward.kind}</span><b>{reward.rarity}</b></div><h3>{reward.name}</h3><p>{reward.description}</p>{reward.availableUntil && <small>SEASON CLOSE · {new Date(reward.availableUntil).toLocaleDateString()}</small>}</div>
          <div className={styles.rewardAction}><strong>{reward.price} PTS</strong>{isOwned ? <button disabled={Boolean(busy) || isEquipped} onClick={() => equipReward(reward)}>{isEquipped ? "Equipped" : busy === `equip-${reward.id}` ? "Approving…" : "Equip on-chain"}</button> : <button disabled={Boolean(busy) || !isAvailable} onClick={() => redeemReward(reward)}>{!isAvailable ? "Closed" : busy === `reward-${reward.id}` ? "Approving…" : "Redeem"}</button>}</div>
        </article>;
      })}</div>
    </section>

    {(notice || lastSignature) && <div className={styles.notice} role="status"><span>{notice || "Latest transaction finalized on Solana devnet."}</span>{lastSignature && <a href={`https://explorer.solana.com/tx/${lastSignature}?cluster=devnet`} target="_blank" rel="noreferrer">Explorer <ExternalLink size={12} /></a>}<button type="button" aria-label="Dismiss notification" onClick={() => { setNotice(""); setLastSignature(""); }}><X size={13} /></button></div>}
    <footer><span>PULSEPROOF FAN ZONE · TXLINE CONSUMER EXPERIENCE</span><span>NON-TRANSFERABLE · NO FINANCIAL REWARDS · DEVNET</span></footer>
  </main>;
}
