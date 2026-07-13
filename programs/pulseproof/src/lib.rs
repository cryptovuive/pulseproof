use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::{
    load_current_index_checked, load_instruction_at_checked,
};

declare_id!("74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn");

const CONFIG_SEED: &[u8] = b"config";
const FAN_PASS_SEED: &[u8] = b"fan_pass";
const RECEIPT_SEED: &[u8] = b"receipt";
const ATTESTATION_PREFIX: &str = "PULSEPROOF_V1";
const ED25519_PROGRAM_ID: Pubkey = pubkey!("Ed25519SigVerify111111111111111111111111111");

#[program]
pub mod pulseproof {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>, attestor: [u8; 32]) -> Result<()> {
        require!(attestor != [0; 32], PulseProofError::InvalidAttestor);
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.attestor = attestor;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn update_attestor(ctx: Context<UpdateAttestor>, attestor: [u8; 32]) -> Result<()> {
        require!(attestor != [0; 32], PulseProofError::InvalidAttestor);
        ctx.accounts.config.attestor = attestor;
        Ok(())
    }

    pub fn create_match_pass(ctx: Context<CreateMatchPass>, fixture_id: u64) -> Result<()> {
        let clock = Clock::get()?;
        let fan_pass = &mut ctx.accounts.fan_pass;
        fan_pass.owner = ctx.accounts.owner.key();
        fan_pass.fixture_id = fixture_id;
        fan_pass.checked_in_at = clock.unix_timestamp;
        fan_pass.points = 0;
        fan_pass.badges = 0;
        fan_pass.claims = 0;
        fan_pass.bump = ctx.bumps.fan_pass;
        emit!(MatchPassCreated {
            owner: fan_pass.owner,
            fixture_id,
            checked_in_at: fan_pass.checked_in_at,
        });
        Ok(())
    }

    pub fn claim_moment(
        ctx: Context<ClaimMoment>,
        moment_hash: [u8; 32],
        evidence_hash: [u8; 32],
        points: u32,
        badge: u8,
        expires_at: i64,
    ) -> Result<()> {
        require!(badge < 64, PulseProofError::InvalidBadge);
        require!(points > 0 && points <= 100, PulseProofError::InvalidPoints);
        let clock = Clock::get()?;
        require!(expires_at >= clock.unix_timestamp, PulseProofError::AttestationExpired);
        require!(expires_at <= clock.unix_timestamp + 600, PulseProofError::ExpiryTooFar);

        let expected_message = format!(
            "{}|{}|{}|{}|{}|{}|{}|{}",
            ATTESTATION_PREFIX,
            ctx.accounts.owner.key(),
            ctx.accounts.fan_pass.fixture_id,
            to_hex(&moment_hash),
            to_hex(&evidence_hash),
            points,
            badge,
            expires_at,
        );
        verify_ed25519_instruction(
            &ctx.accounts.instructions,
            &ctx.accounts.config.attestor,
            expected_message.as_bytes(),
        )?;

        let fan_pass = &mut ctx.accounts.fan_pass;
        fan_pass.points = fan_pass
            .points
            .checked_add(points)
            .ok_or(PulseProofError::PointsOverflow)?;
        fan_pass.badges |= 1u64 << badge;
        fan_pass.claims = fan_pass
            .claims
            .checked_add(1)
            .ok_or(PulseProofError::ClaimsOverflow)?;

        let receipt = &mut ctx.accounts.receipt;
        receipt.owner = ctx.accounts.owner.key();
        receipt.fixture_id = fan_pass.fixture_id;
        receipt.moment_hash = moment_hash;
        receipt.evidence_hash = evidence_hash;
        receipt.points = points;
        receipt.badge = badge;
        receipt.claimed_at = clock.unix_timestamp;
        receipt.bump = ctx.bumps.receipt;

        emit!(MomentClaimed {
            owner: receipt.owner,
            fixture_id: receipt.fixture_id,
            moment_hash,
            points,
            badge,
            total_points: fan_pass.points,
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PulseConfig::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, PulseConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateAttestor<'info> {
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = authority @ PulseProofError::Unauthorized,
    )]
    pub config: Account<'info, PulseConfig>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(fixture_id: u64)]
pub struct CreateMatchPass<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, PulseConfig>,
    #[account(
        init,
        payer = owner,
        space = 8 + FanPass::INIT_SPACE,
        seeds = [FAN_PASS_SEED, owner.key().as_ref(), &fixture_id.to_le_bytes()],
        bump,
    )]
    pub fan_pass: Account<'info, FanPass>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(moment_hash: [u8; 32])]
pub struct ClaimMoment<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, PulseConfig>,
    #[account(
        mut,
        seeds = [FAN_PASS_SEED, owner.key().as_ref(), &fan_pass.fixture_id.to_le_bytes()],
        bump = fan_pass.bump,
        has_one = owner @ PulseProofError::Unauthorized,
    )]
    pub fan_pass: Account<'info, FanPass>,
    #[account(
        init,
        payer = owner,
        space = 8 + MomentReceipt::INIT_SPACE,
        seeds = [RECEIPT_SEED, owner.key().as_ref(), &moment_hash],
        bump,
    )]
    pub receipt: Account<'info, MomentReceipt>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: Address constraint pins this account to the instructions sysvar.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: UncheckedAccount<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct PulseConfig {
    pub authority: Pubkey,
    pub attestor: [u8; 32],
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct FanPass {
    pub owner: Pubkey,
    pub fixture_id: u64,
    pub checked_in_at: i64,
    pub points: u32,
    pub badges: u64,
    pub claims: u16,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct MomentReceipt {
    pub owner: Pubkey,
    pub fixture_id: u64,
    pub moment_hash: [u8; 32],
    pub evidence_hash: [u8; 32],
    pub points: u32,
    pub badge: u8,
    pub claimed_at: i64,
    pub bump: u8,
}

#[event]
pub struct MatchPassCreated {
    pub owner: Pubkey,
    pub fixture_id: u64,
    pub checked_in_at: i64,
}

#[event]
pub struct MomentClaimed {
    pub owner: Pubkey,
    pub fixture_id: u64,
    pub moment_hash: [u8; 32],
    pub points: u32,
    pub badge: u8,
    pub total_points: u32,
}

fn verify_ed25519_instruction(
    instructions_sysvar: &UncheckedAccount,
    expected_public_key: &[u8; 32],
    expected_message: &[u8],
) -> Result<()> {
    let current_index = load_current_index_checked(instructions_sysvar)? as usize;
    require!(current_index > 0, PulseProofError::MissingEd25519Instruction);
    let instruction = load_instruction_at_checked(current_index - 1, instructions_sysvar)?;
    require_keys_eq!(instruction.program_id, ED25519_PROGRAM_ID, PulseProofError::InvalidEd25519Program);

    let data = instruction.data;
    require!(data.len() >= 16, PulseProofError::MalformedEd25519Instruction);
    require!(data[0] == 1 && data[1] == 0, PulseProofError::MalformedEd25519Instruction);

    let signature_offset = read_u16(&data, 2)? as usize;
    let signature_instruction_index = read_u16(&data, 4)?;
    let public_key_offset = read_u16(&data, 6)? as usize;
    let public_key_instruction_index = read_u16(&data, 8)?;
    let message_offset = read_u16(&data, 10)? as usize;
    let message_size = read_u16(&data, 12)? as usize;
    let message_instruction_index = read_u16(&data, 14)?;

    require!(
        signature_instruction_index == u16::MAX
            && public_key_instruction_index == u16::MAX
            && message_instruction_index == u16::MAX,
        PulseProofError::CrossInstructionDataUnsupported,
    );
    require!(
        signature_offset.checked_add(64).is_some_and(|end| end <= data.len())
            && public_key_offset.checked_add(32).is_some_and(|end| end <= data.len())
            && message_offset.checked_add(message_size).is_some_and(|end| end <= data.len()),
        PulseProofError::MalformedEd25519Instruction,
    );
    require!(
        &data[public_key_offset..public_key_offset + 32] == expected_public_key,
        PulseProofError::InvalidAttestor,
    );
    require!(message_size == expected_message.len(), PulseProofError::InvalidAttestationMessage);
    require!(
        &data[message_offset..message_offset + message_size] == expected_message,
        PulseProofError::InvalidAttestationMessage,
    );
    Ok(())
}

fn read_u16(data: &[u8], offset: usize) -> Result<u16> {
    let bytes = data
        .get(offset..offset + 2)
        .ok_or(PulseProofError::MalformedEd25519Instruction)?;
    Ok(u16::from_le_bytes([bytes[0], bytes[1]]))
}

fn to_hex(bytes: &[u8; 32]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut result = String::with_capacity(64);
    for byte in bytes {
        result.push(HEX[(byte >> 4) as usize] as char);
        result.push(HEX[(byte & 0x0f) as usize] as char);
    }
    result
}

#[error_code]
pub enum PulseProofError {
    #[msg("The caller is not authorised for this account")]
    Unauthorized,
    #[msg("The configured or supplied attestor is invalid")]
    InvalidAttestor,
    #[msg("Badge index must be between 0 and 63")]
    InvalidBadge,
    #[msg("Moment points must be between 1 and 100")]
    InvalidPoints,
    #[msg("Attestation has expired")]
    AttestationExpired,
    #[msg("Attestation expiry is too far in the future")]
    ExpiryTooFar,
    #[msg("An Ed25519 verification instruction must immediately precede claim_moment")]
    MissingEd25519Instruction,
    #[msg("The preceding instruction is not the Ed25519 program")]
    InvalidEd25519Program,
    #[msg("The Ed25519 verification instruction is malformed")]
    MalformedEd25519Instruction,
    #[msg("Cross-instruction Ed25519 data references are not accepted")]
    CrossInstructionDataUnsupported,
    #[msg("The attestation message does not match the claim")]
    InvalidAttestationMessage,
    #[msg("Fan points overflow")]
    PointsOverflow,
    #[msg("Claim counter overflow")]
    ClaimsOverflow,
}
