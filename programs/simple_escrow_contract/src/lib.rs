use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use std::collections::HashMap;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod token_price_betting_game {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, admin: Pubkey) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;
        game_state.admin = admin;
        game_state.next_game_id = 1;
        game_state.total_escrow_balance = 0;

        Ok(())
    }

    pub fn create_game(
        ctx: Context<CreateGame>,
        token_mint: Pubkey,
        start_time: i64,
        end_time: i64,
    ) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;
        let games = &mut ctx.accounts.games;

        // Only admin can create games
        require!(
            game_state.admin == ctx.accounts.admin.key(),
            BettingError::NotAuthorized
        );

        // Validate game time
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        require!(start_time > current_time, BettingError::InvalidGameTime);
        require!(end_time > start_time, BettingError::InvalidGameTime);
        require!(
            end_time - start_time == 300,
            BettingError::InvalidGameDuration
        ); // 5 minutes (300 seconds)

        let game_id = game_state.next_game_id;
        game_state.next_game_id += 1;

        games.games.push(Game {
            id: game_id,
            token_mint,
            start_time,
            end_time,
            is_active: true,
            is_completed: false,
            is_aborted: false,
            actual_price: None,
            total_bet_amount: 0,
        });

        emit!(GameCreatedEvent {
            game_id,
            token_mint,
            start_time,
            end_time,
        });

        Ok(())
    }

    pub fn place_bet(
        ctx: Context<PlaceBet>,
        game_id: u64,
        predicted_price: u64,
        amount: u64,
    ) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;
        let games = &mut ctx.accounts.games;
        let bets = &mut ctx.accounts.bets;

        // Find the game
        let game_index = games
            .games
            .iter()
            .position(|g| g.id == game_id)
            .ok_or(BettingError::GameNotFound)?;
        let game = &mut games.games[game_index];

        // Check if game is active and within time bounds
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        require!(game.is_active, BettingError::GameNotActive);
        require!(!game.is_completed, BettingError::GameAlreadyCompleted);
        require!(!game.is_aborted, BettingError::GameAborted);
        require!(
            current_time >= game.start_time,
            BettingError::GameNotStarted
        );
        require!(current_time < game.end_time, BettingError::GameAlreadyEnded);

        // Transfer tokens from user to escrow
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.escrow_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Record the bet
        bets.bets.push(Bet {
            bettor: ctx.accounts.user.key(),
            game_id,
            predicted_price,
            amount,
            is_claimed: false,
        });

        // Update game and global state
        game.total_bet_amount += amount;
        game_state.total_escrow_balance += amount;

        emit!(BetPlacedEvent {
            game_id,
            bettor: ctx.accounts.user.key(),
            predicted_price,
            amount,
        });

        Ok(())
    }

    pub fn end_game(ctx: Context<EndGame>, game_id: u64, actual_price: u64) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;
        let games = &mut ctx.accounts.games;

        // Only admin can end games
        require!(
            game_state.admin == ctx.accounts.admin.key(),
            BettingError::NotAuthorized
        );

        // Find the game
        let game_index = games
            .games
            .iter()
            .position(|g| g.id == game_id)
            .ok_or(BettingError::GameNotFound)?;
        let game = &mut games.games[game_index];

        // Check if game is active and time has ended
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        require!(game.is_active, BettingError::GameNotActive);
        require!(!game.is_completed, BettingError::GameAlreadyCompleted);
        require!(!game.is_aborted, BettingError::GameAborted);
        require!(current_time >= game.end_time, BettingError::GameNotEnded);

        // Mark game as completed and set the actual price
        game.is_completed = true;
        game.is_active = false;
        game.actual_price = Some(actual_price);

        emit!(GameEndedEvent {
            game_id,
            actual_price,
        });

        Ok(())
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>, game_id: u64) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;
        let games = &ctx.accounts.games;
        let bets = &mut ctx.accounts.bets;

        // Find the game
        let game_index = games
            .games
            .iter()
            .position(|g| g.id == game_id)
            .ok_or(BettingError::GameNotFound)?;
        let game = &games.games[game_index];

        // Check if game is completed
        require!(game.is_completed, BettingError::GameNotCompleted);
        require!(!game.is_aborted, BettingError::GameAborted);
        require!(game.actual_price.is_some(), BettingError::ActualPriceNotSet);

        let actual_price = game.actual_price.unwrap();

        // Find user's bets for this game
        let mut user_bets = vec![];
        let mut bet_indices = vec![];

        for (i, bet) in bets.bets.iter().enumerate() {
            if bet.game_id == game_id && bet.bettor == ctx.accounts.user.key() && !bet.is_claimed {
                user_bets.push(bet.clone());
                bet_indices.push(i);
            }
        }

        require!(!user_bets.is_empty(), BettingError::NoBetsFound);

        // Calculate winners based on closest prediction
        let mut winners = calculate_winners(game, &bets.bets);
        let mut total_winnings = 0;

        // Check if user won and calculate winnings
        for bet in &user_bets {
            if let Some(win_amount) = winners.remove(&bet.bettor) {
                total_winnings += win_amount;
            }
        }

        require!(total_winnings > 0, BettingError::NoWinningsAvailable);

        // Mark bets as claimed
        for &idx in &bet_indices {
            bets.bets[idx].is_claimed = true;
        }

        // Transfer winnings to user
        let escrow_seeds = &[b"escrow".as_ref(), &[game_state.escrow_bump]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_authority.to_account_info(),
                },
                &[escrow_seeds],
            ),
            total_winnings,
        )?;

        // Update escrow balance
        game_state.total_escrow_balance -= total_winnings;

        emit!(WinningsClaimedEvent {
            game_id,
            bettor: ctx.accounts.user.key(),
            amount: total_winnings,
        });

        Ok(())
    }

    pub fn abort_game(ctx: Context<AbortGame>, game_id: u64) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;
        let games = &mut ctx.accounts.games;

        // Only admin can abort games
        require!(
            game_state.admin == ctx.accounts.admin.key(),
            BettingError::NotAuthorized
        );

        // Find the game
        let game_index = games
            .games
            .iter()
            .position(|g| g.id == game_id)
            .ok_or(BettingError::GameNotFound)?;
        let game = &mut games.games[game_index];

        // Check if game can be aborted
        require!(!game.is_completed, BettingError::GameAlreadyCompleted);
        require!(!game.is_aborted, BettingError::GameAlreadyAborted);

        // Mark game as aborted
        game.is_aborted = true;
        game.is_active = false;

        emit!(GameAbortedEvent { game_id });

        Ok(())
    }

    pub fn refund_bet(ctx: Context<RefundBet>, game_id: u64) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;
        let games = &ctx.accounts.games;
        let bets = &mut ctx.accounts.bets;

        // Find the game
        let game_index = games
            .games
            .iter()
            .position(|g| g.id == game_id)
            .ok_or(BettingError::GameNotFound)?;
        let game = &games.games[game_index];

        // Check if game is aborted
        require!(game.is_aborted, BettingError::GameNotAborted);

        // Find user's bets for this game
        let mut user_bets = vec![];
        let mut bet_indices = vec![];

        for (i, bet) in bets.bets.iter().enumerate() {
            if bet.game_id == game_id && bet.bettor == ctx.accounts.user.key() && !bet.is_claimed {
                user_bets.push(bet.clone());
                bet_indices.push(i);
            }
        }

        require!(!user_bets.is_empty(), BettingError::NoBetsFound);

        // Calculate total refund amount
        let mut total_refund = 0;
        for bet in &user_bets {
            total_refund += bet.amount;
        }

        // Mark bets as claimed
        for &idx in &bet_indices {
            bets.bets[idx].is_claimed = true;
        }

        // Transfer refund to user
        let escrow_seeds = &[b"escrow".as_ref(), &[game_state.escrow_bump]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_authority.to_account_info(),
                },
                &[escrow_seeds],
            ),
            total_refund,
        )?;

        // Update escrow balance
        game_state.total_escrow_balance -= total_refund;

        emit!(BetRefundedEvent {
            game_id,
            bettor: ctx.accounts.user.key(),
            amount: total_refund,
        });

        Ok(())
    }

    pub fn admin_withdraw(ctx: Context<AdminWithdraw>, amount: u64) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;

        // Only admin can withdraw
        require!(
            game_state.admin == ctx.accounts.admin.key(),
            BettingError::NotAuthorized
        );

        // Check available balance
        require!(
            amount <= game_state.total_escrow_balance,
            BettingError::InsufficientFunds
        );

        // Transfer funds to admin
        let escrow_seeds = &[b"escrow".as_ref(), &[game_state.escrow_bump]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.admin_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_authority.to_account_info(),
                },
                &[escrow_seeds],
            ),
            amount,
        )?;

        // Update escrow balance
        game_state.total_escrow_balance -= amount;

        emit!(AdminWithdrawEvent {
            admin: ctx.accounts.admin.key(),
            amount,
        });

        Ok(())
    }
}

// Helper function to calculate winners and prize distribution
fn calculate_winners(game: &Game, all_bets: &[Bet]) -> HashMap<Pubkey, u64> {
    let mut winners = HashMap::new();

    if game.is_completed && !game.is_aborted && game.actual_price.is_some() {
        let actual_price = game.actual_price.unwrap();
        let total_pot = game.total_bet_amount;

        // Calculate the distance of each bet from the actual price
        let mut bet_distances: Vec<(Pubkey, u64, u64)> = Vec::new(); // (bettor, amount, distance)

        for bet in all_bets {
            if bet.game_id == game.id && !bet.is_claimed {
                let distance = if bet.predicted_price > actual_price {
                    bet.predicted_price - actual_price
                } else {
                    actual_price - bet.predicted_price
                };

                bet_distances.push((bet.bettor, bet.amount, distance));
            }
        }

        // Sort by distance (closest first)
        bet_distances.sort_by_key(|&(_, _, distance)| distance);

        // If there are any bets
        if !bet_distances.is_empty() {
            // Find all bets that have the minimum distance (could be multiple with same distance)
            let min_distance = bet_distances[0].2;
            let closest_bets: Vec<(Pubkey, u64)> = bet_distances
                .iter()
                .filter(|&&(_, _, distance)| distance == min_distance)
                .map(|&(bettor, amount, _)| (bettor, amount))
                .collect();

            // Calculate the total amount bet by winners
            let mut total_winning_bets = 0;
            for &(_, amount) in &closest_bets {
                total_winning_bets += amount;
            }

            // Distribute the pot proportionally to winning bet amounts
            for (bettor, amount) in closest_bets {
                let win_share = (amount as u128 * total_pot as u128) / total_winning_bets as u128;

                // Add to existing winnings if bettor already has an entry
                *winners.entry(bettor).or_insert(0) += win_share as u64;
            }
        }
    }

    winners
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = 8 + 32 + 8 + 8 + 1)]
    pub game_state: Account<'info, GameState>,

    #[account(init, payer = payer, space = 8 + 4 + 1000)] // Adjust space as needed
    pub games: Account<'info, Games>,

    #[account(init, payer = payer, space = 8 + 4 + 2000)] // Adjust space as needed
    pub bets: Account<'info, Bets>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(mut)]
    pub game_state: Account<'info, GameState>,

    #[account(mut)]
    pub games: Account<'info, Games>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub game_state: Account<'info, GameState>,

    #[account(mut)]
    pub games: Account<'info, Games>,

    #[account(mut)]
    pub bets: Account<'info, Bets>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct EndGame<'info> {
    #[account(mut)]
    pub game_state: Account<'info, GameState>,

    #[account(mut)]
    pub games: Account<'info, Games>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub game_state: Account<'info, GameState>,

    pub games: Account<'info, Games>,

    #[account(mut)]
    pub bets: Account<'info, Bets>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is the PDA that serves as the authority for the escrow
    pub escrow_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AbortGame<'info> {
    #[account(mut)]
    pub game_state: Account<'info, GameState>,

    #[account(mut)]
    pub games: Account<'info, Games>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct RefundBet<'info> {
    #[account(mut)]
    pub game_state: Account<'info, GameState>,

    pub games: Account<'info, Games>,

    #[account(mut)]
    pub bets: Account<'info, Bets>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is the PDA that serves as the authority for the escrow
    pub escrow_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdminWithdraw<'info> {
    #[account(mut)]
    pub game_state: Account<'info, GameState>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub admin_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is the PDA that serves as the authority for the escrow
    pub escrow_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct GameState {
    pub admin: Pubkey,
    pub next_game_id: u64,
    pub total_escrow_balance: u64,
    pub escrow_bump: u8,
}

#[account]
pub struct Games {
    pub games: Vec<Game>,
}

#[account]
pub struct Bets {
    pub bets: Vec<Bet>,
}

#[derive(Clone, Copy, Debug, PartialEq, AnchorSerialize, AnchorDeserialize)]
pub struct Game {
    pub id: u64,
    pub token_mint: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub is_active: bool,
    pub is_completed: bool,
    pub is_aborted: bool,
    pub actual_price: Option<u64>,
    pub total_bet_amount: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, AnchorSerialize, AnchorDeserialize)]
pub struct Bet {
    pub bettor: Pubkey,
    pub game_id: u64,
    pub predicted_price: u64,
    pub amount: u64,
    pub is_claimed: bool,
}

#[error_code]
pub enum BettingError {
    #[msg("Not authorized")]
    NotAuthorized,
    #[msg("Game not found")]
    GameNotFound,
    #[msg("Game not active")]
    GameNotActive,
    #[msg("Game already completed")]
    GameAlreadyCompleted,
    #[msg("Game aborted")]
    GameAborted,
    #[msg("Game not started yet")]
    GameNotStarted,
    #[msg("Game already ended")]
    GameAlreadyEnded,
    #[msg("Game has not ended yet")]
    GameNotEnded,
    #[msg("Game not completed")]
    GameNotCompleted,
    #[msg("Actual price not set")]
    ActualPriceNotSet,
    #[msg("No bets found")]
    NoBetsFound,
    #[msg("No winnings available")]
    NoWinningsAvailable,
    #[msg("Game already aborted")]
    GameAlreadyAborted,
    #[msg("Game not aborted")]
    GameNotAborted,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid game time")]
    InvalidGameTime,
    #[msg("Invalid game duration")]
    InvalidGameDuration,
}

// Events
#[event]
pub struct GameCreatedEvent {
    pub game_id: u64,
    pub token_mint: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
}

#[event]
pub struct BetPlacedEvent {
    pub game_id: u64,
    pub bettor: Pubkey,
    pub predicted_price: u64,
    pub amount: u64,
}

#[event]
pub struct GameEndedEvent {
    pub game_id: u64,
    pub actual_price: u64,
}

#[event]
pub struct WinningsClaimedEvent {
    pub game_id: u64,
    pub bettor: Pubkey,
    pub amount: u64,
}

#[event]
pub struct GameAbortedEvent {
    pub game_id: u64,
}

#[event]
pub struct BetRefundedEvent {
    pub game_id: u64,
    pub bettor: Pubkey,
    pub amount: u64,
}

#[event]
pub struct AdminWithdrawEvent {
    pub admin: Pubkey,
    pub amount: u64,
}
