"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Radio, Send, ShieldCheck } from "lucide-react";
import { Buffer } from "buffer";
import type { BrowserWallet } from "@/lib/solana-client";
import { fetchFanAlias } from "@/lib/solana-client";
import { buildChatSigningPayload } from "@/lib/chat-signature";
import type { CommunityMessage, FanAlias } from "@/types/pulse";
import styles from "./match-chat.module.css";

export function MatchChat({ fixtureId, fixtureLabel, wallet, walletKey, onNotice }: {
  fixtureId: number;
  fixtureLabel: string;
  wallet: BrowserWallet | null;
  walletKey: string;
  onNotice: (message: string) => void;
}) {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [online, setOnline] = useState(0);
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [alias, setAlias] = useState<FanAlias | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    if (!walletKey) {
      const timer = window.setTimeout(() => setAlias(null), 0);
      return () => window.clearTimeout(timer);
    }
    fetchFanAlias(walletKey).then((value) => { if (active) setAlias(value); }).catch(() => { if (active) setAlias(null); });
    return () => { active = false; };
  }, [walletKey]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => { setMessages([]); setOnline(0); setStatus("connecting"); }, 0);
    const source = new EventSource(`/api/community/chat?fixtureId=${fixtureId}`);
    source.addEventListener("ready", () => setStatus("live"));
    source.addEventListener("history", (event) => setMessages((JSON.parse((event as MessageEvent).data) as { messages: CommunityMessage[] }).messages));
    source.addEventListener("message", (event) => {
      const message = JSON.parse((event as MessageEvent).data) as CommunityMessage;
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current.slice(-49), message]);
    });
    source.addEventListener("presence", (event) => setOnline((JSON.parse((event as MessageEvent).data) as { online: number }).online));
    source.onerror = () => setStatus("offline");
    return () => { window.clearTimeout(resetTimer); source.close(); };
  }, [fixtureId]);

  const send = async () => {
    const normalizedBody = body.replace(/\s+/g, " ").trim();
    if (!normalizedBody || sending) return;
    if (!wallet || !walletKey) { onNotice("Connect Phantom before posting in this match room."); return; }
    if (!alias) { onNotice("Create an on-chain display name in Fan Zone before posting."); return; }
    try {
      setSending(true);
      const signedAt = Date.now();
      const signed = await wallet.signMessage(buildChatSigningPayload({ wallet: walletKey, fixtureId, signedAt, body: normalizedBody }));
      const response = await fetch("/api/community/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fixtureId, wallet: walletKey, body: normalizedBody, signedAt, signatureBase64: Buffer.from(signed.signature).toString("base64") }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Message could not be sent");
      setBody("");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Message could not be sent");
    } finally { setSending(false); }
  };

  return <article className={styles.chat} id="match-chat">
    <header><div><span>WORLD CUP MATCH ROOM · WALLET-SIGNED</span><h3><MessageCircle size={17} /> {fixtureLabel}</h3></div><b><i className={status === "live" ? styles.live : styles.offline} />{status === "live" ? `${online} online` : status}</b></header>
    <div className={styles.guard}><ShieldCheck size={13} /> Name from Fan Alias PDA · no links · no betting · no wallet secrets</div>
    <div className={styles.log}>{messages.length ? messages.map((message) => <div key={message.id} className={message.wallet === walletKey ? styles.mine : ""}><header><strong>{message.nickname}</strong><code>{message.walletHint}</code><time>{message.createdAt.slice(11, 16)} UTC</time></header><p>{message.body}</p></div>) : <div className={styles.empty}><Radio size={20} /><strong>This World Cup room is quiet.</strong><span>Be the first verified fan to start the conversation.</span></div>}</div>
    {alias ? <div className={styles.composer}><label><span>POSTING AS {alias.displayName}</span><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={280} placeholder="Talk about this match…" /></label><button disabled={sending || status !== "live" || !body.trim()} onClick={() => void send()}><Send size={14} />{sending ? "Sign in Phantom…" : "Sign & send"}</button></div> : <div className={styles.aliasGate}><span>{walletKey ? "This wallet has no Fan Alias yet." : "Connect Phantom, then create a public fan name."}</span><Link href="/fan-zone">Create / edit name</Link></div>}
  </article>;
}
