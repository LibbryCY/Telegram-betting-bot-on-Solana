const CoinGecko = require("coingecko-api");
const CoinGeckoClient = new CoinGecko();
const symbolToId = require("./simbol-map");
const fs = require("fs");
const bs58 = require("bs58");
const {
  Keypair,
  Connection,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  SystemProgram,
} = require("@solana/web3.js");
const anchor = require("@project-serum/anchor");
const { IDL } = require("./IDL");
const programId = new PublicKey(
  process.env.PROGRAM_ID || "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
);

async function getPrice(tokenName) {
  if (!tokenName || typeof tokenName !== "string") {
    console.error("Token name is required");
    return;
  }

  const tokenInput = tokenName.toUpperCase();

  let coinId = symbolToId[tokenInput];

  if (!coinId) {
    coinId = tokenName.toLowerCase().trim();
  }

  try {
    const response = await CoinGeckoClient.simple.price({
      ids: [coinId],
      vs_currencies: ["usd"],
    });

    return response.data;
  } catch (error) {
    console.error(error);
    return 0;
  }
}

// anchor program init
const adminKeypair = Keypair.fromSecretKey(
  bs58.default.decode(
    process.env.ADMIN_SECRET_KEY ||
      "42EjbPNtHP4Z5qfTWs9oB6QBotBp2dCxZoev7KWthLYQnShttK6Smt5MqqqcLamWEpnvxrLjZYcRyDwW8wA9PKbK"
  )
);
const idl = IDL;

const connection = new anchor.web3.Connection(
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"
);
const provider = new anchor.AnchorProvider(
  connection,
  new anchor.Wallet(adminKeypair),
  {}
);
anchor.setProvider(provider);

const program = new anchor.Program(idl, programId, provider);

const [gameStatePDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("game_state")],
  program.programId
);

const [gamesPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("games"), gameStatePDA.toBuffer()],
  program.programId
);

const [betsPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("bets"), gameStatePDA.toBuffer()],
  program.programId
);

const [escrowTokenPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("escrow_token_account"),
    new anchor.BN(0).toArrayLike(Buffer, "le", 8),
  ],
  program.programId
);

async function inite() {
  try {
    const tx = await program.methods
      .initialize(adminKeypair.publicKey)
      .accounts({
        gameState: gameStatePDA,
        games: gamesPDA,
        bets: betsPDA,
        payer: adminKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([adminKeypair])
      .rpc();
  } catch (error) {
    console.error("Failed to initialize contract: ", error);
  }
}
inite();

module.exports = {
  getPrice,
  connection,
  adminKeypair,
  gameStatePDA,
  gamesPDA,
  betsPDA,
  escrowTokenPDA,
  program,
};
