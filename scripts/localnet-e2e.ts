import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  Connection,
  Ed25519Program,
  Keypair,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import nacl from "tweetnacl";

const RPC = process.env.LOCALNET_RPC_URL ?? "http://127.0.0.1:8899";
const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PULSEPROOF_PROGRAM_ID ?? "74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn",
);
const WALLET_PATH = process.env.LOCALNET_WALLET ?? ".anchor/test-payer.json";
const connection = new Connection(RPC, "confirmed");

const sha256 = (value: string) => createHash("sha256").update(value).digest();
const discriminator = (name: string) => sha256(`global:${name}`).subarray(0, 8);
const u64 = (value: number | bigint) => {
  const output = Buffer.alloc(8);
  output.writeBigUInt64LE(BigInt(value));
  return output;
};
const i64 = (value: number | bigint) => {
  const output = Buffer.alloc(8);
  output.writeBigInt64LE(BigInt(value));
  return output;
};
const u32 = (value: number) => {
  const output = Buffer.alloc(4);
  output.writeUInt32LE(value);
  return output;
};

async function payerFromFile() {
  const bytes = JSON.parse(await readFile(WALLET_PATH, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}

function initConfigInstruction(payer: PublicKey, attestor: Uint8Array) {
  const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  return {
    config,
    instruction: new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: config, isSigner: false, isWritable: true },
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([discriminator("initialize_config"), Buffer.from(attestor)]),
    }),
  };
}

function createPassInstruction(owner: PublicKey, fixtureId: number, config: PublicKey) {
  const fixtureBytes = u64(fixtureId);
  const [fanPass] = PublicKey.findProgramAddressSync(
    [Buffer.from("fan_pass"), owner.toBuffer(), fixtureBytes],
    PROGRAM_ID,
  );
  return {
    fanPass,
    instruction: new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: config, isSigner: false, isWritable: false },
        { pubkey: fanPass, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([discriminator("create_match_pass"), fixtureBytes]),
    }),
  };
}

type Claim = {
  fixtureId: number;
  momentHash: Buffer;
  evidenceHash: Buffer;
  points: number;
  badge: number;
  expiresAt: number;
};

function claimMessage(owner: PublicKey, claim: Claim) {
  return Buffer.from(
    [
      "PULSEPROOF_V1",
      owner.toBase58(),
      String(claim.fixtureId),
      claim.momentHash.toString("hex"),
      claim.evidenceHash.toString("hex"),
      String(claim.points),
      String(claim.badge),
      String(claim.expiresAt),
    ].join("|"),
  );
}

function claimInstructions(
  owner: PublicKey,
  config: PublicKey,
  fanPass: PublicKey,
  attestor: nacl.SignKeyPair,
  signedClaim: Claim,
  submittedClaim: Claim = signedClaim,
) {
  const signature = nacl.sign.detached(claimMessage(owner, signedClaim), attestor.secretKey);
  const [receipt] = PublicKey.findProgramAddressSync(
    [Buffer.from("receipt"), owner.toBuffer(), submittedClaim.momentHash],
    PROGRAM_ID,
  );
  return {
    receipt,
    ed25519: Ed25519Program.createInstructionWithPublicKey({
      publicKey: attestor.publicKey,
      message: claimMessage(owner, signedClaim),
      signature,
    }),
    claim: new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: config, isSigner: false, isWritable: false },
        { pubkey: fanPass, isSigner: false, isWritable: true },
        { pubkey: receipt, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        discriminator("claim_moment"),
        submittedClaim.momentHash,
        submittedClaim.evidenceHash,
        u32(submittedClaim.points),
        Buffer.from([submittedClaim.badge]),
        i64(submittedClaim.expiresAt),
      ]),
    }),
  };
}

async function expectRejected(label: string, action: () => Promise<unknown>) {
  let rejected = false;
  try {
    await action();
  } catch {
    rejected = true;
  }
  assert.equal(rejected, true, `${label} should have been rejected`);
}

async function main() {
  const payer = await payerFromFile();
  const attestor = nacl.sign.keyPair();
  const fixtureId = 18209181;
  const { config, instruction: initConfig } = initConfigInstruction(payer.publicKey, attestor.publicKey);
  await sendAndConfirmTransaction(connection, new Transaction().add(initConfig), [payer], { commitment: "confirmed" });

  const configData = (await connection.getAccountInfo(config, "confirmed"))?.data;
  assert(configData, "config account was not created");
  assert.deepEqual(configData.subarray(40, 72), Buffer.from(attestor.publicKey), "on-chain attestor mismatch");

  const { fanPass, instruction: createPass } = createPassInstruction(payer.publicKey, fixtureId, config);
  await sendAndConfirmTransaction(connection, new Transaction().add(createPass), [payer], { commitment: "confirmed" });

  const now = Math.floor(Date.now() / 1000);
  const validClaim: Claim = {
    fixtureId,
    momentHash: sha256("fixture-18209181-seq-341-game_finalised"),
    evidenceHash: sha256("txline-proof-response-digest"),
    points: 20,
    badge: 7,
    expiresAt: now + 300,
  };
  const valid = claimInstructions(payer.publicKey, config, fanPass, attestor, validClaim);
  const validSignature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(valid.ed25519, valid.claim),
    [payer],
    { commitment: "confirmed" },
  );
  assert(await connection.getAccountInfo(valid.receipt, "confirmed"), "receipt account was not created");

  const fanPassData = (await connection.getAccountInfo(fanPass, "confirmed"))?.data;
  assert(fanPassData, "fan pass account was not created");
  assert.equal(fanPassData.readUInt32LE(56), 20, "points were not accumulated");
  assert.equal(fanPassData.readBigUInt64LE(60), 1n << 7n, "badge bitmap was not updated");
  assert.equal(fanPassData.readUInt16LE(68), 1, "claim counter was not updated");

  await expectRejected("duplicate receipt", () =>
    sendAndConfirmTransaction(connection, new Transaction().add(valid.ed25519, valid.claim), [payer]),
  );

  const tamperedSigned: Claim = {
    ...validClaim,
    momentHash: sha256("tampered-points-signed"),
    evidenceHash: sha256("tampered-points-evidence"),
    points: 12,
  };
  const tamperedSubmitted: Claim = { ...tamperedSigned, points: 99 };
  const tampered = claimInstructions(
    payer.publicKey,
    config,
    fanPass,
    attestor,
    tamperedSigned,
    tamperedSubmitted,
  );
  await expectRejected("tampered points", () =>
    sendAndConfirmTransaction(connection, new Transaction().add(tampered.ed25519, tampered.claim), [payer]),
  );

  const tamperedEvidenceSigned: Claim = {
    ...validClaim,
    momentHash: sha256("tampered-evidence-signed"),
    evidenceHash: sha256("original-evidence"),
  };
  const tamperedEvidenceSubmitted: Claim = {
    ...tamperedEvidenceSigned,
    evidenceHash: sha256("attacker-replaced-evidence"),
  };
  const tamperedEvidence = claimInstructions(
    payer.publicKey,
    config,
    fanPass,
    attestor,
    tamperedEvidenceSigned,
    tamperedEvidenceSubmitted,
  );
  await expectRejected("tampered evidence digest", () =>
    sendAndConfirmTransaction(connection, new Transaction().add(tamperedEvidence.ed25519, tamperedEvidence.claim), [payer]),
  );

  const wrongAttestorClaim: Claim = {
    ...validClaim,
    momentHash: sha256("wrong-attestor-moment"),
    evidenceHash: sha256("wrong-attestor-evidence"),
  };
  const wrongAttestor = claimInstructions(
    payer.publicKey,
    config,
    fanPass,
    nacl.sign.keyPair(),
    wrongAttestorClaim,
  );
  await expectRejected("wrong attestor", () =>
    sendAndConfirmTransaction(connection, new Transaction().add(wrongAttestor.ed25519, wrongAttestor.claim), [payer]),
  );

  const expiredClaim: Claim = {
    ...validClaim,
    momentHash: sha256("expired-moment"),
    evidenceHash: sha256("expired-evidence"),
    expiresAt: now - 1,
  };
  const expired = claimInstructions(payer.publicKey, config, fanPass, attestor, expiredClaim);
  await expectRejected("expired attestation", () =>
    sendAndConfirmTransaction(connection, new Transaction().add(expired.ed25519, expired.claim), [payer]),
  );

  const invalidBadgeClaim: Claim = {
    ...validClaim,
    momentHash: sha256("invalid-badge-moment"),
    evidenceHash: sha256("invalid-badge-evidence"),
    badge: 64,
  };
  const invalidBadge = claimInstructions(payer.publicKey, config, fanPass, attestor, invalidBadgeClaim);
  await expectRejected("badge outside bitmap", () =>
    sendAndConfirmTransaction(connection, new Transaction().add(invalidBadge.ed25519, invalidBadge.claim), [payer]),
  );

  const invalidPointsClaim: Claim = {
    ...validClaim,
    momentHash: sha256("invalid-points-moment"),
    evidenceHash: sha256("invalid-points-evidence"),
    points: 101,
  };
  const invalidPoints = claimInstructions(payer.publicKey, config, fanPass, attestor, invalidPointsClaim);
  await expectRejected("points above cap", () =>
    sendAndConfirmTransaction(connection, new Transaction().add(invalidPoints.ed25519, invalidPoints.claim), [payer]),
  );

  const farExpiryClaim: Claim = {
    ...validClaim,
    momentHash: sha256("far-expiry-moment"),
    evidenceHash: sha256("far-expiry-evidence"),
    expiresAt: now + 3_600,
  };
  const farExpiry = claimInstructions(payer.publicKey, config, fanPass, attestor, farExpiryClaim);
  await expectRejected("expiry above ten-minute bound", () =>
    sendAndConfirmTransaction(connection, new Transaction().add(farExpiry.ed25519, farExpiry.claim), [payer]),
  );

  const finalFanPass = (await connection.getAccountInfo(fanPass, "confirmed"))?.data;
  assert(finalFanPass, "fan pass disappeared");
  assert.equal(finalFanPass.readUInt32LE(56), 20, "failed claims mutated points");
  assert.equal(finalFanPass.readUInt16LE(68), 1, "failed claims mutated claim count");

  console.log(JSON.stringify({
    ok: true,
    programId: PROGRAM_ID.toBase58(),
    config: config.toBase58(),
    fanPass: fanPass.toBase58(),
    receipt: valid.receipt.toBase58(),
    validSignature,
    assertions: [
      "config attestor pinned",
      "valid Ed25519 claim accepted",
      "points, badge and counter updated",
      "duplicate receipt rejected",
      "tampered points rejected",
      "tampered evidence digest rejected",
      "wrong attestor rejected",
      "expired attestation rejected",
      "badge and points bounds enforced",
      "far-future expiry rejected",
      "failed claims left state unchanged",
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
