IDL = {
  address: "8Ytc3NMi1Rg76pwixFCTrqP6udeyB5dmD1ukmaYRtJjS",
  metadata: {
    name: "simple_escrow_contract",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Created with Anchor",
  },
  instructions: [
    {
      name: "abort_game",
      discriminator: [88, 212, 191, 204, 41, 184, 234, 83],
      accounts: [
        {
          name: "game_state",
          writable: true,
        },
        {
          name: "games",
          writable: true,
        },
        {
          name: "admin",
          signer: true,
        },
      ],
      args: [
        {
          name: "game_id",
          type: "u64",
        },
      ],
    },
    {
      name: "admin_withdraw",
      discriminator: [160, 166, 147, 222, 46, 220, 75, 224],
      accounts: [
        {
          name: "game_state",
          writable: true,
        },
        {
          name: "admin",
          writable: true,
          signer: true,
        },
        {
          name: "admin_token_account",
          writable: true,
        },
        {
          name: "escrow_token_account",
          writable: true,
        },
        {
          name: "escrow_authority",
        },
        {
          name: "token_program",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
      ],
      args: [
        {
          name: "amount",
          type: "u64",
        },
      ],
    },
    {
      name: "claim_winnings",
      discriminator: [161, 215, 24, 59, 14, 236, 242, 221],
      accounts: [
        {
          name: "game_state",
          writable: true,
        },
        {
          name: "games",
        },
        {
          name: "bets",
          writable: true,
        },
        {
          name: "user",
          writable: true,
          signer: true,
        },
        {
          name: "user_token_account",
          writable: true,
        },
        {
          name: "escrow_token_account",
          writable: true,
        },
        {
          name: "escrow_authority",
        },
        {
          name: "token_program",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
      ],
      args: [
        {
          name: "game_id",
          type: "u64",
        },
      ],
    },
    {
      name: "create_game",
      discriminator: [124, 69, 75, 66, 184, 220, 72, 206],
      accounts: [
        {
          name: "game_state",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [103, 97, 109, 101, 95, 115, 116, 97, 116, 101],
              },
            ],
          },
        },
        {
          name: "games",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [103, 97, 109, 101, 115],
              },
              {
                kind: "account",
                path: "game_state",
              },
            ],
          },
        },
        {
          name: "user",
          signer: true,
        },
      ],
      args: [
        {
          name: "token_mint",
          type: "pubkey",
        },
        {
          name: "start_time",
          type: "i64",
        },
        {
          name: "end_time",
          type: "i64",
        },
      ],
    },
    {
      name: "distribute_winnings",
      discriminator: [208, 254, 127, 148, 78, 104, 249, 250],
      accounts: [
        {
          name: "admin",
          writable: true,
          signer: true,
        },
        {
          name: "game_state",
          writable: true,
        },
        {
          name: "games",
        },
        {
          name: "bets",
          writable: true,
        },
        {
          name: "winner",
        },
        {
          name: "winner_token_account",
          writable: true,
        },
        {
          name: "escrow_authority",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [101, 115, 99, 114, 111, 119],
              },
            ],
          },
        },
        {
          name: "escrow_token_account",
          writable: true,
        },
        {
          name: "token_program",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "game_id",
          type: "u64",
        },
      ],
    },
    {
      name: "end_game",
      discriminator: [224, 135, 245, 99, 67, 175, 121, 252],
      accounts: [
        {
          name: "admin",
          writable: true,
          signer: true,
        },
        {
          name: "game_state",
          writable: true,
        },
        {
          name: "games",
          writable: true,
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "game_id",
          type: "u64",
        },
        {
          name: "starting_price",
          type: "u64",
        },
        {
          name: "ending_price",
          type: "u64",
        },
      ],
    },
    {
      name: "initialize",
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237],
      accounts: [
        {
          name: "game_state",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [103, 97, 109, 101, 95, 115, 116, 97, 116, 101],
              },
            ],
          },
        },
        {
          name: "games",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [103, 97, 109, 101, 115],
              },
              {
                kind: "account",
                path: "game_state",
              },
            ],
          },
        },
        {
          name: "bets",
          writable: true,
          signer: true,
        },
        {
          name: "payer",
          writable: true,
          signer: true,
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "admin",
          type: "pubkey",
        },
      ],
    },
    {
      name: "place_bet",
      discriminator: [222, 62, 67, 220, 63, 166, 126, 33],
      accounts: [
        {
          name: "game_state",
          writable: true,
        },
        {
          name: "games",
          writable: true,
        },
        {
          name: "bets",
          writable: true,
        },
        {
          name: "user",
          writable: true,
          signer: true,
        },
        {
          name: "user_token_account",
          writable: true,
        },
        {
          name: "escrow_token_account",
          writable: true,
        },
        {
          name: "token_program",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
      ],
      args: [
        {
          name: "game_id",
          type: "u64",
        },
        {
          name: "position",
          type: {
            defined: {
              name: "BetPosition",
            },
          },
        },
        {
          name: "amount",
          type: "u64",
        },
      ],
    },
    {
      name: "refund_bet",
      discriminator: [209, 182, 226, 96, 55, 121, 83, 183],
      accounts: [
        {
          name: "game_state",
          writable: true,
        },
        {
          name: "games",
        },
        {
          name: "bets",
          writable: true,
        },
        {
          name: "user",
          writable: true,
          signer: true,
        },
        {
          name: "user_token_account",
          writable: true,
        },
        {
          name: "escrow_token_account",
          writable: true,
        },
        {
          name: "escrow_authority",
        },
        {
          name: "token_program",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
      ],
      args: [
        {
          name: "game_id",
          type: "u64",
        },
      ],
    },
  ],
  accounts: [
    {
      name: "Bets",
      discriminator: [20, 148, 228, 64, 106, 67, 70, 31],
    },
    {
      name: "GameState",
      discriminator: [144, 94, 208, 172, 248, 99, 134, 120],
    },
    {
      name: "Games",
      discriminator: [73, 124, 61, 201, 178, 83, 6, 66],
    },
  ],
  events: [
    {
      name: "AdminWithdrawEvent",
      discriminator: [209, 205, 149, 148, 126, 161, 184, 237],
    },
    {
      name: "AllWinningsDistributedEvent",
      discriminator: [52, 254, 191, 83, 6, 203, 170, 230],
    },
    {
      name: "BetPlacedEvent",
      discriminator: [218, 76, 236, 147, 222, 135, 81, 43],
    },
    {
      name: "BetRefundedEvent",
      discriminator: [247, 195, 184, 175, 225, 9, 181, 44],
    },
    {
      name: "GameAbortedEvent",
      discriminator: [228, 71, 112, 142, 226, 148, 153, 125],
    },
    {
      name: "GameCreatedEvent",
      discriminator: [171, 34, 37, 152, 111, 164, 74, 55],
    },
    {
      name: "GameEndedEvent",
      discriminator: [124, 244, 251, 112, 20, 68, 87, 116],
    },
    {
      name: "WinningsClaimedEvent",
      discriminator: [30, 231, 120, 152, 158, 82, 26, 135],
    },
    {
      name: "WinningsDistributedEvent",
      discriminator: [19, 216, 247, 6, 3, 227, 74, 101],
    },
  ],
  errors: [
    {
      code: 6000,
      name: "NotAuthorized",
      msg: "Not authorized",
    },
    {
      code: 6001,
      name: "GameNotFound",
      msg: "Game not found",
    },
    {
      code: 6002,
      name: "GameNotActive",
      msg: "Game not active",
    },
    {
      code: 6003,
      name: "GameAlreadyCompleted",
      msg: "Game already completed",
    },
    {
      code: 6004,
      name: "GameAborted",
      msg: "Game aborted",
    },
    {
      code: 6005,
      name: "GameNotStarted",
      msg: "Game not started yet",
    },
    {
      code: 6006,
      name: "GameAlreadyEnded",
      msg: "Game already ended",
    },
    {
      code: 6007,
      name: "GameNotEnded",
      msg: "Game has not ended yet",
    },
    {
      code: 6008,
      name: "GameNotCompleted",
      msg: "Game not completed",
    },
    {
      code: 6009,
      name: "ActualPriceNotSet",
      msg: "Actual price not set",
    },
    {
      code: 6010,
      name: "EndingPriceNotSet",
      msg: "Ending price not set",
    },
    {
      code: 6011,
      name: "StartingPriceNotSet",
      msg: "Starting price not set",
    },
    {
      code: 6012,
      name: "NoBetsFound",
      msg: "No bets found",
    },
    {
      code: 6013,
      name: "NoWinningsAvailable",
      msg: "No winnings available",
    },
    {
      code: 6014,
      name: "GameAlreadyAborted",
      msg: "Game already aborted",
    },
    {
      code: 6015,
      name: "GameNotAborted",
      msg: "Game not aborted",
    },
    {
      code: 6016,
      name: "InsufficientFunds",
      msg: "Insufficient funds",
    },
    {
      code: 6017,
      name: "InvalidGameTime",
      msg: "Invalid game time",
    },
    {
      code: 6018,
      name: "InvalidGameDuration",
      msg: "Invalid game duration",
    },
    {
      code: 6019,
      name: "TokenAccountNotFound",
      msg: "Token account not found",
    },
    {
      code: 6020,
      name: "NotEnoughAccounts",
      msg: "Not enough accounts provided",
    },
  ],
  types: [
    {
      name: "AdminWithdrawEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "admin",
            type: "pubkey",
          },
          {
            name: "amount",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "AllWinningsDistributedEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "game_id",
            type: "u64",
          },
          {
            name: "total_amount",
            type: "u64",
          },
          {
            name: "winner_count",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "Bet",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bettor",
            type: "pubkey",
          },
          {
            name: "game_id",
            type: "u64",
          },
          {
            name: "position",
            type: {
              defined: {
                name: "BetPosition",
              },
            },
          },
          {
            name: "amount",
            type: "u64",
          },
          {
            name: "is_claimed",
            type: "bool",
          },
        ],
      },
    },
    {
      name: "BetPlacedEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "game_id",
            type: "u64",
          },
          {
            name: "bettor",
            type: "pubkey",
          },
          {
            name: "position",
            type: {
              defined: {
                name: "BetPosition",
              },
            },
          },
          {
            name: "amount",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "BetPosition",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Long",
          },
          {
            name: "Short",
          },
        ],
      },
    },
    {
      name: "BetRefundedEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "game_id",
            type: "u64",
          },
          {
            name: "bettor",
            type: "pubkey",
          },
          {
            name: "amount",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "Bets",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bets",
            type: {
              vec: {
                defined: {
                  name: "Bet",
                },
              },
            },
          },
        ],
      },
    },
    {
      name: "Game",
      type: {
        kind: "struct",
        fields: [
          {
            name: "id",
            type: "u64",
          },
          {
            name: "token_mint",
            type: "pubkey",
          },
          {
            name: "start_time",
            type: "i64",
          },
          {
            name: "end_time",
            type: "i64",
          },
          {
            name: "is_active",
            type: "bool",
          },
          {
            name: "is_completed",
            type: "bool",
          },
          {
            name: "is_aborted",
            type: "bool",
          },
          {
            name: "starting_price",
            type: {
              option: "u64",
            },
          },
          {
            name: "ending_price",
            type: {
              option: "u64",
            },
          },
          {
            name: "total_bet_amount",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "GameAbortedEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "game_id",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "GameCreatedEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "game_id",
            type: "u64",
          },
          {
            name: "token_mint",
            type: "pubkey",
          },
          {
            name: "start_time",
            type: "i64",
          },
          {
            name: "end_time",
            type: "i64",
          },
        ],
      },
    },
    {
      name: "GameEndedEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "game_id",
            type: "u64",
          },
          {
            name: "starting_price",
            type: "u64",
          },
          {
            name: "ending_price",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "GameState",
      type: {
        kind: "struct",
        fields: [
          {
            name: "admin",
            type: "pubkey",
          },
          {
            name: "next_game_id",
            type: "u64",
          },
          {
            name: "total_escrow_balance",
            type: "u64",
          },
          {
            name: "escrow_bump",
            type: "u8",
          },
        ],
      },
    },
    {
      name: "Games",
      type: {
        kind: "struct",
        fields: [
          {
            name: "games",
            type: {
              vec: {
                defined: {
                  name: "Game",
                },
              },
            },
          },
        ],
      },
    },
    {
      name: "WinningsClaimedEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "game_id",
            type: "u64",
          },
          {
            name: "bettor",
            type: "pubkey",
          },
          {
            name: "amount",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "WinningsDistributedEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "game_id",
            type: "u64",
          },
          {
            name: "winner",
            type: "pubkey",
          },
          {
            name: "amount",
            type: "u64",
          },
        ],
      },
    },
  ],
};

module.exports = IDL;
