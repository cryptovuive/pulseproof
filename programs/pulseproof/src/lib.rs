use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::{
    load_current_index_checked, load_instruction_at_checked,
};

declare_id!("74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn");

const CONFIG_SEED: &[u8] = b"config";
const FAN_PASS_SEED: &[u8] = b"fan_pass";
const FAN_PROFILE_SEED: &[u8] = b"fan_profile";
const FAN_ALIAS_SEED: &[u8] = b"fan_alias";
const FAN_EPOCH_SEED: &[u8] = b"fan_epoch";
const RECEIPT_SEED: &[u8] = b"receipt";
const QUIZ_RECEIPT_SEED: &[u8] = b"quiz_receipt";
const REWARD_RECEIPT_SEED: &[u8] = b"reward_receipt";
const ATTESTATION_PREFIX: &str = "PULSEPROOF_V1";
const QUIZ_ATTESTATION_PREFIX: &str = "PULSEPROOF_QUIZ_V1";
const REWARD_ATTESTATION_PREFIX: &str = "PULSEPROOF_REWARD_V1";
const ED25519_PROGRAM_ID: Pubkey = pubkey!("Ed25519SigVerify111111111111111111111111111");
const UNEQUIPPED: u16 = u16::MAX;
const REWARD_CATALOG_ITEM_COUNT: u16 = 36;
const DEVNET_TEST_POINT_CAP: u64 = 1_000;

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

    pub fn create_fan_profile(ctx: Context<CreateFanProfile>) -> Result<()> {
        let profile = &mut ctx.accounts.fan_profile;
        profile.owner = ctx.accounts.owner.key();
        reset_profile_state(profile, 0);
        profile.bump = ctx.bumps.fan_profile;
        emit!(FanProfileCreated {
            owner: profile.owner
        });
        Ok(())
    }

    pub fn set_fan_alias(ctx: Context<SetFanAlias>, display_name: String) -> Result<()> {
        let character_count = display_name.chars().count();
        require!(
            (2..=24).contains(&character_count) && display_name.len() <= 48,
            PulseProofError::InvalidDisplayName
        );
        require!(
            display_name == display_name.trim()
                && !display_name.chars().any(|character| {
                    character.is_control() || matches!(character, '<' | '>' | '&' | '|' | '/')
                }),
            PulseProofError::InvalidDisplayName
        );

        let alias = &mut ctx.accounts.fan_alias;
        alias.owner = ctx.accounts.owner.key();
        alias.display_name = display_name.clone();
        alias.updated_at = Clock::get()?.unix_timestamp;
        alias.bump = ctx.bumps.fan_alias;
        emit!(FanAliasUpdated {
            owner: alias.owner,
            display_name,
            updated_at: alias.updated_at,
        });
        Ok(())
    }

    pub fn daily_check_in(ctx: Context<DailyCheckIn>) -> Result<()> {
        let clock = Clock::get()?;
        let day = clock.unix_timestamp.div_euclid(86_400);
        let profile = &mut ctx.accounts.fan_profile;
        require!(
            profile.last_checkin_day != day,
            PulseProofError::AlreadyCheckedIn
        );

        profile.current_streak = if profile.last_checkin_day == day - 1 {
            profile.current_streak.saturating_add(1)
        } else {
            1
        };
        profile.best_streak = profile.best_streak.max(profile.current_streak);
        let streak_bonus = u64::from(profile.current_streak.saturating_sub(1).min(6)) * 2;
        let points = 10u64 + streak_bonus;
        profile.points_earned = profile
            .points_earned
            .checked_add(points)
            .ok_or(PulseProofError::PointsOverflow)?;
        profile.checkins = profile
            .checkins
            .checked_add(1)
            .ok_or(PulseProofError::ClaimsOverflow)?;
        profile.last_checkin_day = day;

        emit!(DailyCheckInClaimed {
            owner: profile.owner,
            day,
            streak: profile.current_streak,
            points,
            total_points: profile.points_earned,
        });
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
        initialize_fan_epoch(
            &mut ctx.accounts.fan_epoch,
            ctx.accounts.owner.key(),
            ctx.bumps.fan_epoch,
        )?;
        require!(badge < 64, PulseProofError::InvalidBadge);
        require!(points > 0 && points <= 100, PulseProofError::InvalidPoints);
        let clock = Clock::get()?;
        require!(
            expires_at >= clock.unix_timestamp,
            PulseProofError::AttestationExpired
        );
        require!(
            expires_at <= clock.unix_timestamp + 600,
            PulseProofError::ExpiryTooFar
        );

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
        let fan_profile = &mut ctx.accounts.fan_profile;
        fan_profile.points_earned = fan_profile
            .points_earned
            .checked_add(u64::from(points))
            .ok_or(PulseProofError::PointsOverflow)?;
        fan_profile.claims = fan_profile
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

    pub fn claim_quiz(
        ctx: Context<ClaimQuiz>,
        quiz_hash: [u8; 32],
        score: u8,
        points: u32,
        expires_at: i64,
    ) -> Result<()> {
        initialize_fan_epoch(
            &mut ctx.accounts.fan_epoch,
            ctx.accounts.owner.key(),
            ctx.bumps.fan_epoch,
        )?;
        require!(score > 0 && score <= 5, PulseProofError::InvalidQuizScore);
        require!(points > 0 && points <= 100, PulseProofError::InvalidPoints);
        let clock = Clock::get()?;
        validate_expiry(clock.unix_timestamp, expires_at)?;
        let expected_message = format!(
            "{}|{}|{}|{}|{}|{}",
            QUIZ_ATTESTATION_PREFIX,
            ctx.accounts.owner.key(),
            to_hex(&quiz_hash),
            score,
            points,
            expires_at,
        );
        verify_ed25519_instruction(
            &ctx.accounts.instructions,
            &ctx.accounts.config.attestor,
            expected_message.as_bytes(),
        )?;

        let profile = &mut ctx.accounts.fan_profile;
        profile.points_earned = profile
            .points_earned
            .checked_add(u64::from(points))
            .ok_or(PulseProofError::PointsOverflow)?;
        profile.quiz_claims = profile
            .quiz_claims
            .checked_add(1)
            .ok_or(PulseProofError::ClaimsOverflow)?;
        profile.claims = profile
            .claims
            .checked_add(1)
            .ok_or(PulseProofError::ClaimsOverflow)?;

        let receipt = &mut ctx.accounts.quiz_receipt;
        receipt.owner = profile.owner;
        receipt.quiz_hash = quiz_hash;
        receipt.score = score;
        receipt.points = points;
        receipt.claimed_at = clock.unix_timestamp;
        receipt.bump = ctx.bumps.quiz_receipt;

        emit!(QuizClaimed {
            owner: profile.owner,
            quiz_hash,
            score,
            points,
            total_points: profile.points_earned,
        });
        Ok(())
    }

    pub fn redeem_reward(
        ctx: Context<RedeemReward>,
        reward_hash: [u8; 32],
        kind: u8,
        item_index: u16,
        cost: u64,
        expires_at: i64,
    ) -> Result<()> {
        initialize_fan_epoch(
            &mut ctx.accounts.fan_epoch,
            ctx.accounts.owner.key(),
            ctx.bumps.fan_epoch,
        )?;
        require!(kind < 4, PulseProofError::InvalidRewardKind);
        require!(
            item_index < REWARD_CATALOG_ITEM_COUNT,
            PulseProofError::InvalidRewardIndex
        );
        require!(
            catalog_kind_matches(kind, item_index),
            PulseProofError::RewardKindMismatch
        );
        require!(
            cost > 0 && cost <= 10_000,
            PulseProofError::InvalidRewardCost
        );
        let clock = Clock::get()?;
        validate_expiry(clock.unix_timestamp, expires_at)?;
        let expected_message = format!(
            "{}|{}|{}|{}|{}|{}|{}",
            REWARD_ATTESTATION_PREFIX,
            ctx.accounts.owner.key(),
            to_hex(&reward_hash),
            kind,
            item_index,
            cost,
            expires_at,
        );
        verify_ed25519_instruction(
            &ctx.accounts.instructions,
            &ctx.accounts.config.attestor,
            expected_message.as_bytes(),
        )?;

        let profile = &mut ctx.accounts.fan_profile;
        require!(
            !owns_reward(profile, item_index),
            PulseProofError::RewardAlreadyOwned
        );
        let available = profile
            .points_earned
            .checked_sub(profile.points_spent)
            .ok_or(PulseProofError::PointsOverflow)?;
        require!(available >= cost, PulseProofError::InsufficientPoints);
        profile.points_spent = profile
            .points_spent
            .checked_add(cost)
            .ok_or(PulseProofError::PointsOverflow)?;
        let word = usize::from(item_index / 64);
        let bit = u32::from(item_index % 64);
        profile.inventory[word] |= 1u64 << bit;
        profile.claims = profile
            .claims
            .checked_add(1)
            .ok_or(PulseProofError::ClaimsOverflow)?;

        let receipt = &mut ctx.accounts.reward_receipt;
        receipt.owner = profile.owner;
        receipt.reward_hash = reward_hash;
        receipt.kind = kind;
        receipt.item_index = item_index;
        receipt.cost = cost;
        receipt.redeemed_at = clock.unix_timestamp;
        receipt.bump = ctx.bumps.reward_receipt;

        emit!(RewardRedeemed {
            owner: profile.owner,
            reward_hash,
            kind,
            item_index,
            cost,
            points_remaining: profile.points_earned - profile.points_spent,
        });
        Ok(())
    }

    pub fn equip_reward(ctx: Context<EquipReward>, kind: u8, item_index: u16) -> Result<()> {
        require!(kind < 4, PulseProofError::InvalidRewardKind);
        require!(
            item_index < REWARD_CATALOG_ITEM_COUNT,
            PulseProofError::InvalidRewardIndex
        );
        require!(
            catalog_kind_matches(kind, item_index),
            PulseProofError::RewardKindMismatch
        );
        let profile = &mut ctx.accounts.fan_profile;
        require!(
            owns_reward(profile, item_index),
            PulseProofError::RewardNotOwned
        );
        match kind {
            0 | 1 => profile.equipped_badge = item_index,
            2 => profile.equipped_frame = item_index,
            3 => profile.equipped_character = item_index,
            _ => return err!(PulseProofError::InvalidRewardKind),
        }
        emit!(RewardEquipped {
            owner: profile.owner,
            kind,
            item_index
        });
        Ok(())
    }

    pub fn reset_devnet_test_profile(
        ctx: Context<ResetDevnetTestProfile>,
        _owner: Pubkey,
        test_points: u64,
    ) -> Result<()> {
        require!(
            test_points <= DEVNET_TEST_POINT_CAP,
            PulseProofError::InvalidTestPointGrant
        );
        let profile = &mut ctx.accounts.fan_profile;
        reset_profile_state(profile, test_points);

        let fan_epoch = &mut ctx.accounts.fan_epoch;
        if fan_epoch.owner == Pubkey::default() {
            fan_epoch.owner = profile.owner;
            fan_epoch.epoch = 1;
        } else {
            require_keys_eq!(
                fan_epoch.owner,
                profile.owner,
                PulseProofError::Unauthorized
            );
            fan_epoch.epoch = fan_epoch
                .epoch
                .checked_add(1)
                .ok_or(PulseProofError::ClaimsOverflow)?;
        }
        fan_epoch.bump = ctx.bumps.fan_epoch;

        emit!(DevnetTestProfileReset {
            owner: profile.owner,
            epoch: fan_epoch.epoch,
            test_points,
        });
        Ok(())
    }

    pub fn close_devnet_test_alias(
        _ctx: Context<CloseDevnetTestAlias>,
        _owner: Pubkey,
    ) -> Result<()> {
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
pub struct CreateFanProfile<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + FanProfile::INIT_SPACE,
        seeds = [FAN_PROFILE_SEED, owner.key().as_ref()],
        bump,
    )]
    pub fan_profile: Account<'info, FanProfile>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DailyCheckIn<'info> {
    #[account(
        mut,
        seeds = [FAN_PROFILE_SEED, owner.key().as_ref()],
        bump = fan_profile.bump,
        has_one = owner @ PulseProofError::Unauthorized,
    )]
    pub fan_profile: Account<'info, FanProfile>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetFanAlias<'info> {
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + FanAlias::INIT_SPACE,
        seeds = [FAN_ALIAS_SEED, owner.key().as_ref()],
        bump,
    )]
    pub fan_alias: Account<'info, FanAlias>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
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
        mut,
        seeds = [FAN_PROFILE_SEED, owner.key().as_ref()],
        bump = fan_profile.bump,
        has_one = owner @ PulseProofError::Unauthorized,
    )]
    pub fan_profile: Account<'info, FanProfile>,
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + FanEpoch::INIT_SPACE,
        seeds = [FAN_EPOCH_SEED, owner.key().as_ref()],
        bump,
        constraint = fan_epoch.owner == Pubkey::default() || fan_epoch.owner == owner.key() @ PulseProofError::Unauthorized,
    )]
    pub fan_epoch: Account<'info, FanEpoch>,
    #[account(
        init,
        payer = owner,
        space = 8 + MomentReceipt::INIT_SPACE,
        seeds = [RECEIPT_SEED, owner.key().as_ref(), &fan_epoch.epoch.to_le_bytes(), &moment_hash],
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

#[derive(Accounts)]
#[instruction(quiz_hash: [u8; 32])]
pub struct ClaimQuiz<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, PulseConfig>,
    #[account(
        mut,
        seeds = [FAN_PROFILE_SEED, owner.key().as_ref()],
        bump = fan_profile.bump,
        has_one = owner @ PulseProofError::Unauthorized,
    )]
    pub fan_profile: Account<'info, FanProfile>,
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + FanEpoch::INIT_SPACE,
        seeds = [FAN_EPOCH_SEED, owner.key().as_ref()],
        bump,
        constraint = fan_epoch.owner == Pubkey::default() || fan_epoch.owner == owner.key() @ PulseProofError::Unauthorized,
    )]
    pub fan_epoch: Account<'info, FanEpoch>,
    #[account(
        init,
        payer = owner,
        space = 8 + QuizReceipt::INIT_SPACE,
        seeds = [QUIZ_RECEIPT_SEED, owner.key().as_ref(), &fan_epoch.epoch.to_le_bytes(), &quiz_hash],
        bump,
    )]
    pub quiz_receipt: Account<'info, QuizReceipt>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: Address constraint pins this account to the instructions sysvar.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(reward_hash: [u8; 32])]
pub struct RedeemReward<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, PulseConfig>,
    #[account(
        mut,
        seeds = [FAN_PROFILE_SEED, owner.key().as_ref()],
        bump = fan_profile.bump,
        has_one = owner @ PulseProofError::Unauthorized,
    )]
    pub fan_profile: Account<'info, FanProfile>,
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + FanEpoch::INIT_SPACE,
        seeds = [FAN_EPOCH_SEED, owner.key().as_ref()],
        bump,
        constraint = fan_epoch.owner == Pubkey::default() || fan_epoch.owner == owner.key() @ PulseProofError::Unauthorized,
    )]
    pub fan_epoch: Account<'info, FanEpoch>,
    #[account(
        init,
        payer = owner,
        space = 8 + RewardReceipt::INIT_SPACE,
        seeds = [REWARD_RECEIPT_SEED, owner.key().as_ref(), &fan_epoch.epoch.to_le_bytes(), &reward_hash],
        bump,
    )]
    pub reward_receipt: Account<'info, RewardReceipt>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: Address constraint pins this account to the instructions sysvar.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct EquipReward<'info> {
    #[account(
        mut,
        seeds = [FAN_PROFILE_SEED, owner.key().as_ref()],
        bump = fan_profile.bump,
        has_one = owner @ PulseProofError::Unauthorized,
    )]
    pub fan_profile: Account<'info, FanProfile>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(owner: Pubkey)]
pub struct ResetDevnetTestProfile<'info> {
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = authority @ PulseProofError::Unauthorized,
    )]
    pub config: Account<'info, PulseConfig>,
    #[account(
        mut,
        seeds = [FAN_PROFILE_SEED, owner.as_ref()],
        bump = fan_profile.bump,
        constraint = fan_profile.owner == owner @ PulseProofError::Unauthorized,
    )]
    pub fan_profile: Account<'info, FanProfile>,
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + FanEpoch::INIT_SPACE,
        seeds = [FAN_EPOCH_SEED, owner.as_ref()],
        bump,
        constraint = fan_epoch.owner == Pubkey::default() || fan_epoch.owner == owner @ PulseProofError::Unauthorized,
    )]
    pub fan_epoch: Account<'info, FanEpoch>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(owner: Pubkey)]
pub struct CloseDevnetTestAlias<'info> {
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = authority @ PulseProofError::Unauthorized,
    )]
    pub config: Account<'info, PulseConfig>,
    #[account(
        mut,
        close = authority,
        seeds = [FAN_ALIAS_SEED, owner.as_ref()],
        bump = fan_alias.bump,
        constraint = fan_alias.owner == owner @ PulseProofError::Unauthorized,
    )]
    pub fan_alias: Account<'info, FanAlias>,
    #[account(mut)]
    pub authority: Signer<'info>,
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
pub struct FanProfile {
    pub owner: Pubkey,
    pub points_earned: u64,
    pub points_spent: u64,
    pub checkins: u32,
    pub quiz_claims: u32,
    pub current_streak: u16,
    pub best_streak: u16,
    pub last_checkin_day: i64,
    pub inventory: [u64; 4],
    pub equipped_badge: u16,
    pub equipped_frame: u16,
    pub equipped_character: u16,
    pub claims: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct FanAlias {
    pub owner: Pubkey,
    #[max_len(48)]
    pub display_name: String,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct FanEpoch {
    pub owner: Pubkey,
    pub epoch: u64,
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

#[account]
#[derive(InitSpace)]
pub struct QuizReceipt {
    pub owner: Pubkey,
    pub quiz_hash: [u8; 32],
    pub score: u8,
    pub points: u32,
    pub claimed_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct RewardReceipt {
    pub owner: Pubkey,
    pub reward_hash: [u8; 32],
    pub kind: u8,
    pub item_index: u16,
    pub cost: u64,
    pub redeemed_at: i64,
    pub bump: u8,
}

#[event]
pub struct MatchPassCreated {
    pub owner: Pubkey,
    pub fixture_id: u64,
    pub checked_in_at: i64,
}

#[event]
pub struct FanProfileCreated {
    pub owner: Pubkey,
}

#[event]
pub struct FanAliasUpdated {
    pub owner: Pubkey,
    pub display_name: String,
    pub updated_at: i64,
}

#[event]
pub struct DailyCheckInClaimed {
    pub owner: Pubkey,
    pub day: i64,
    pub streak: u16,
    pub points: u64,
    pub total_points: u64,
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

#[event]
pub struct QuizClaimed {
    pub owner: Pubkey,
    pub quiz_hash: [u8; 32],
    pub score: u8,
    pub points: u32,
    pub total_points: u64,
}

#[event]
pub struct RewardRedeemed {
    pub owner: Pubkey,
    pub reward_hash: [u8; 32],
    pub kind: u8,
    pub item_index: u16,
    pub cost: u64,
    pub points_remaining: u64,
}

#[event]
pub struct RewardEquipped {
    pub owner: Pubkey,
    pub kind: u8,
    pub item_index: u16,
}

#[event]
pub struct DevnetTestProfileReset {
    pub owner: Pubkey,
    pub epoch: u64,
    pub test_points: u64,
}

fn reset_profile_state(profile: &mut FanProfile, points: u64) {
    profile.points_earned = points;
    profile.points_spent = 0;
    profile.checkins = 0;
    profile.quiz_claims = 0;
    profile.current_streak = 0;
    profile.best_streak = 0;
    profile.last_checkin_day = -1;
    profile.inventory = [0; 4];
    profile.equipped_badge = UNEQUIPPED;
    profile.equipped_frame = UNEQUIPPED;
    profile.equipped_character = UNEQUIPPED;
    profile.claims = 0;
}

fn initialize_fan_epoch(fan_epoch: &mut Account<FanEpoch>, owner: Pubkey, bump: u8) -> Result<()> {
    if fan_epoch.owner == Pubkey::default() {
        fan_epoch.owner = owner;
        fan_epoch.epoch = 0;
        fan_epoch.bump = bump;
    } else {
        require_keys_eq!(fan_epoch.owner, owner, PulseProofError::Unauthorized);
    }
    Ok(())
}

fn validate_expiry(now: i64, expires_at: i64) -> Result<()> {
    require!(expires_at >= now, PulseProofError::AttestationExpired);
    require!(expires_at <= now + 600, PulseProofError::ExpiryTooFar);
    Ok(())
}

fn owns_reward(profile: &FanProfile, item_index: u16) -> bool {
    if item_index >= 256 {
        return false;
    }
    let word = usize::from(item_index / 64);
    let bit = u32::from(item_index % 64);
    profile.inventory[word] & (1u64 << bit) != 0
}

fn catalog_kind_matches(kind: u8, item_index: u16) -> bool {
    match kind {
        0 => (6..=17).contains(&item_index),
        1 => (0..=5).contains(&item_index) || (18..=23).contains(&item_index),
        2 => (24..=29).contains(&item_index),
        3 => (30..=35).contains(&item_index),
        _ => false,
    }
}

fn verify_ed25519_instruction(
    instructions_sysvar: &UncheckedAccount,
    expected_public_key: &[u8; 32],
    expected_message: &[u8],
) -> Result<()> {
    let current_index = load_current_index_checked(instructions_sysvar)? as usize;
    require!(
        current_index > 0,
        PulseProofError::MissingEd25519Instruction
    );
    let instruction = load_instruction_at_checked(current_index - 1, instructions_sysvar)?;
    require_keys_eq!(
        instruction.program_id,
        ED25519_PROGRAM_ID,
        PulseProofError::InvalidEd25519Program
    );

    let data = instruction.data;
    require!(
        data.len() >= 16,
        PulseProofError::MalformedEd25519Instruction
    );
    require!(
        data[0] == 1 && data[1] == 0,
        PulseProofError::MalformedEd25519Instruction
    );

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
        signature_offset
            .checked_add(64)
            .is_some_and(|end| end <= data.len())
            && public_key_offset
                .checked_add(32)
                .is_some_and(|end| end <= data.len())
            && message_offset
                .checked_add(message_size)
                .is_some_and(|end| end <= data.len()),
        PulseProofError::MalformedEd25519Instruction,
    );
    require!(
        &data[public_key_offset..public_key_offset + 32] == expected_public_key,
        PulseProofError::InvalidAttestor,
    );
    require!(
        message_size == expected_message.len(),
        PulseProofError::InvalidAttestationMessage
    );
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
    #[msg("This wallet has already checked in for the current UTC day")]
    AlreadyCheckedIn,
    #[msg("Quiz score must be between 1 and 5")]
    InvalidQuizScore,
    #[msg("Reward kind must be badge, medal, frame or character")]
    InvalidRewardKind,
    #[msg("Reward index must be between 0 and 35")]
    InvalidRewardIndex,
    #[msg("Reward cost is outside the accepted range")]
    InvalidRewardCost,
    #[msg("This reward is already present in the fan inventory")]
    RewardAlreadyOwned,
    #[msg("The fan profile does not have enough available points")]
    InsufficientPoints,
    #[msg("The selected reward is not owned by this fan profile")]
    RewardNotOwned,
    #[msg("Reward kind does not match the signed catalog index")]
    RewardKindMismatch,
    #[msg("Display name must be 2-24 safe characters and at most 48 UTF-8 bytes")]
    InvalidDisplayName,
    #[msg("Devnet test point grants must be between 0 and 1000")]
    InvalidTestPointGrant,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_kind_ranges_cover_every_active_reward_once() {
        for item_index in 0..REWARD_CATALOG_ITEM_COUNT {
            let matching_kinds = (0..4)
                .filter(|kind| catalog_kind_matches(*kind, item_index))
                .count();
            assert_eq!(matching_kinds, 1, "reward index {item_index}");
        }
    }

    #[test]
    fn retired_and_out_of_range_rewards_are_rejected() {
        for item_index in REWARD_CATALOG_ITEM_COUNT..=u16::MAX {
            assert!(!(0..4).any(|kind| catalog_kind_matches(kind, item_index)));
        }
    }

    #[test]
    fn devnet_reset_clears_progression_and_applies_bounded_test_points() {
        let owner = Pubkey::new_unique();
        let mut profile = FanProfile {
            owner,
            points_earned: 999,
            points_spent: 700,
            checkins: 9,
            quiz_claims: 4,
            current_streak: 6,
            best_streak: 7,
            last_checkin_day: 123,
            inventory: [u64::MAX; 4],
            equipped_badge: 7,
            equipped_frame: 24,
            equipped_character: 30,
            claims: 13,
            bump: 250,
        };

        reset_profile_state(&mut profile, DEVNET_TEST_POINT_CAP);

        assert_eq!(profile.owner, owner);
        assert_eq!(profile.bump, 250);
        assert_eq!(profile.points_earned, 1_000);
        assert_eq!(profile.points_spent, 0);
        assert_eq!(profile.checkins, 0);
        assert_eq!(profile.quiz_claims, 0);
        assert_eq!(profile.current_streak, 0);
        assert_eq!(profile.best_streak, 0);
        assert_eq!(profile.last_checkin_day, -1);
        assert_eq!(profile.inventory, [0; 4]);
        assert_eq!(profile.equipped_badge, UNEQUIPPED);
        assert_eq!(profile.equipped_frame, UNEQUIPPED);
        assert_eq!(profile.equipped_character, UNEQUIPPED);
        assert_eq!(profile.claims, 0);
    }
}
