export function buildChatSigningPayload(input: {
  wallet: string;
  fixtureId: number;
  signedAt: number;
  body: string;
}) {
  return new TextEncoder().encode(
    `PULSEPROOF_CHAT_V1\n${input.wallet}\n${input.fixtureId}\n${input.signedAt}\n${input.body}`,
  );
}
