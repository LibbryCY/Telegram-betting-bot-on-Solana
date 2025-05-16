IDL = {
  version: "0.1.0",
  name: "token_price_betting_game",
  instructions: [
    {
      name: "initialize",
      accounts: [
        {
          name: "gameState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "games",
          isMut: true,
          isSigner: false,
        },
        {
          name: "bets",
          isMut: true,
          isSigner: false,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "admin",
          type: "publicKey",
        },
      ],
    },
    {
      name: "createGame",
      accounts: [
        {
          name: "gameState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "games",
          isMut: true,
          isSigner: false,
        },
        {
          name: "user",
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "tokenMint",
          type: "publicKey",
        },
        {
          name: "startTime",
          type: "i64",
        },
        {
          name: "endTime",
          type: "i64",
        },
      ],
    },
    {
      name: "placeBet",
      accounts: [
        {
          name: "gameState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "games",
          isMut: true,
          isSigner: false,
        },
        {
          name: "bets",
          isMut: true,
          isSigner: false,
        },
        {
          name: "user",
          isMut: true,
          isSigner: true,
        },
        {
          name: "userTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "escrowTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "gameId",
          type: "u64",
        },
        {
          name: "position",
          type: {
            defined: "BetPosition",
          },
        },
        {
          name: "amount",
          type: "u64",
        },
      ],
    },
    {
      name: "endGame",
      accounts: [
        {
          name: "gameState",
          isMut: true,
          isSigner: false,
          docs: ["CHECK: Validated in constraint"],
        },
        {
          name: "games",
          isMut: true,
          isSigner: false,
        },
        {
          name: "admin",
          isMut: false,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "gameId",
          type: "u64",
        },
        {
          name: "startingPrice",
          type: "u64",
        },
        {
          name: "endingPrice",
          type: "u64",
        },
      ],
    },
    {
      name: "distributeWinnings",
      accounts: [
        {
          name: "gameState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "games",
          isMut: false,
          isSigner: false,
        },
        {
          name: "bets",
          isMut: true,
          isSigner: false,
        },
        {
          name: "winner",
          isMut: false,
          isSigner: false,
        },
        {
          name: "winnerTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "escrowAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "escrowTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "admin",
          isMut: false,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "gameId",
          type: "u64",
        },
      ],
    },
    {
      name: "abortGame",
      accounts: [
        {
          name: "gameState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "games",
          isMut: true,
          isSigner: false,
        },
        {
          name: "admin",
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "gameId",
          type: "u64",
        },
      ],
    },
    {
      name: "refundBet",
      accounts: [
        {
          name: "gameState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "games",
          isMut: false,
          isSigner: false,
        },
        {
          name: "bets",
          isMut: true,
          isSigner: false,
        },
        {
          name: "user",
          isMut: true,
          isSigner: true,
        },
        {
          name: "userTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "escrowTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "escrowAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "gameId",
          type: "u64",
        },
      ],
    },
    {
      name: "adminWithdraw",
      accounts: [
        {
          name: "gameState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "admin",
          isMut: false,
          isSigner: true,
        },
        {
          name: "adminTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "escrowTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "escrowAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "amount",
          type: "u64",
        },
      ],
    },
  ],
  accounts: [
    {
      name: "GameState",
      type: {
        kind: "struct",
        fields: [
          {
            name: "admin",
            type: "publicKey",
          },
          {
            name: "nextGameId",
            type: "u64",
          },
          {
            name: "totalEscrowBalance",
            type: "u64",
          },
          {
            name: "escrowBump",
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
                defined: "Game",
              },
            },
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
                defined: "Bet",
              },
            },
          },
        ],
      },
    },
  ],
  types: [
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
            name: "tokenMint",
            type: "publicKey",
          },
          {
            name: "startTime",
            type: "i64",
          },
          {
            name: "endTime",
            type: "i64",
          },
          {
            name: "isActive",
            type: "bool",
          },
          {
            name: "isCompleted",
            type: "bool",
          },
          {
            name: "isAborted",
            type: "bool",
          },
          {
            name: "startingPrice",
            type: {
              option: "u64",
            },
          },
          {
            name: "endingPrice",
            type: {
              option: "u64",
            },
          },
          {
            name: "totalBetAmount",
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
            type: "publicKey",
          },
          {
            name: "gameId",
            type: "u64",
          },
          {
            name: "position",
            type: {
              defined: "BetPosition",
            },
          },
          {
            name: "amount",
            type: "u64",
          },
          {
            name: "isClaimed",
            type: "bool",
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
  ],
  events: [
    {
      name: "GameCreatedEvent",
      fields: [
        {
          name: "gameId",
          type: "u64",
          index: false,
        },
        {
          name: "tokenMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "startTime",
          type: "i64",
          index: false,
        },
        {
          name: "endTime",
          type: "i64",
          index: false,
        },
      ],
    },
    {
      name: "BetPlacedEvent",
      fields: [
        {
          name: "gameId",
          type: "u64",
          index: false,
        },
        {
          name: "bettor",
          type: "publicKey",
          index: false,
        },
        {
          name: "position",
          type: {
            defined: "BetPosition",
          },
          index: false,
        },
        {
          name: "amount",
          type: "u64",
          index: false,
        },
      ],
    },
    {
      name: "GameEndedEvent",
      fields: [
        {
          name: "gameId",
          type: "u64",
          index: false,
        },
        {
          name: "startingPrice",
          type: "u64",
          index: false,
        },
        {
          name: "endingPrice",
          type: "u64",
          index: false,
        },
      ],
    },
    {
      name: "WinningsDistributedEvent",
      fields: [
        {
          name: "gameId",
          type: "u64",
          index: false,
        },
        {
          name: "winner",
          type: "publicKey",
          index: false,
        },
        {
          name: "amount",
          type: "u64",
          index: false,
        },
      ],
    },
    {
      name: "GameAbortedEvent",
      fields: [
        {
          name: "gameId",
          type: "u64",
          index: false,
        },
      ],
    },
    {
      name: "BetRefundedEvent",
      fields: [
        {
          name: "gameId",
          type: "u64",
          index: false,
        },
        {
          name: "bettor",
          type: "publicKey",
          index: false,
        },
        {
          name: "amount",
          type: "u64",
          index: false,
        },
      ],
    },
    {
      name: "AdminWithdrawEvent",
      fields: [
        {
          name: "admin",
          type: "publicKey",
          index: false,
        },
        {
          name: "amount",
          type: "u64",
          index: false,
        },
      ],
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
      name: "StartingPriceNotSet",
      msg: "Starting price not set",
    },
    {
      code: 6010,
      name: "EndingPriceNotSet",
      msg: "Ending price not set",
    },
    {
      code: 6011,
      name: "NoBetsFound",
      msg: "No bets found",
    },
    {
      code: 6012,
      name: "NoWinningsAvailable",
      msg: "No winnings available",
    },
    {
      code: 6013,
      name: "GameAlreadyAborted",
      msg: "Game already aborted",
    },
    {
      code: 6014,
      name: "GameNotAborted",
      msg: "Game not aborted",
    },
    {
      code: 6015,
      name: "InsufficientFunds",
      msg: "Insufficient funds",
    },
    {
      code: 6016,
      name: "InvalidGameTime",
      msg: "Invalid game time",
    },
    {
      code: 6017,
      name: "InvalidGameDuration",
      msg: "Invalid game duration",
    },
    {
      code: 6018,
      name: "TokenAccountNotFound",
      msg: "Token account not found",
    },
    {
      code: 6019,
      name: "NotEnoughAccounts",
      msg: "Not enough accounts provided",
    },
  ],
  metadata: {
    address: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
  },
};

module.exports = { IDL };
