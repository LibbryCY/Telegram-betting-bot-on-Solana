#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod simple_escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, game_id: String) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let authority = &ctx.accounts.authority;

        escrow.authority = authority.key();
        escrow.game_id = game_id;
        escrow.bump = ctx.bumps.escrow;

        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let from = &ctx.accounts.from;
        let from_token_account = &ctx.accounts.from_token_account;
        let escrow_token_account = &ctx.accounts.escrow_token_account;

        // Transfer tokens from user to escrow
        let transfer_instruction = Transfer {
            from: from_token_account.to_account_info(),
            to: escrow_token_account.to_account_info(),
            authority: from.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );

        token::transfer(cpi_ctx, amount)?;

        emit!(DepositEvent {
            game_id: ctx.accounts.escrow.game_id.clone(),
            from: from.key(),
            amount,
        });

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64, to: Pubkey) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        let escrow_token_account = &ctx.accounts.escrow_token_account;
        let recipient_token_account = &ctx.accounts.recipient_token_account;

        let seeds = &[escrow.game_id.as_bytes(), &[escrow.bump]];
        let signer = &[&seeds[..]];

        // Transfer tokens from escrow to recipient
        let transfer_instruction = Transfer {
            from: escrow_token_account.to_account_info(),
            to: recipient_token_account.to_account_info(),
            authority: escrow.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
            signer,
        );

        token::transfer(cpi_ctx, amount)?;

        emit!(WithdrawEvent {
            game_id: escrow.game_id.clone(),
            to,
            amount,
        });

        Ok(())
    }

    pub fn close_escrow(ctx: Context<CloseEscrow>) -> Result<()> {
        emit!(CloseEvent {
            game_id: ctx.accounts.escrow.game_id.clone(),
        });

        // Account will be closed and rent will be returned to authority
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Escrow::MAX_SIZE,
        seeds = [game_id.as_bytes()],
        bump,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub from: Signer<'info>,

    #[account(mut)]
    pub from_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [escrow.game_id.as_bytes(), b"vault"],
        bump,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        constraint = escrow.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [escrow.game_id.as_bytes(), b"vault"],
        bump,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseEscrow<'info> {
    #[account(
        mut,
        close = authority,
        constraint = escrow.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account]
pub struct Escrow {
    pub authority: Pubkey,
    pub game_id: String,
    pub bump: u8,
}

impl Escrow {
    pub const MAX_SIZE: usize = 32 +                    // authority pubkey
        36 +                    // game_id (max 32 chars + 4 bytes for length)
        1; // bump
}

#[event]
pub struct DepositEvent {
    pub game_id: String,
    pub from: Pubkey,
    pub amount: u64,
}

#[event]
pub struct WithdrawEvent {
    pub game_id: String,
    pub to: Pubkey,
    pub amount: u64,
}

#[event]
pub struct CloseEvent {
    pub game_id: String,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized operation")]
    Unauthorized,
}
