const TelegramBot = require("node-telegram-bot-api");
const {
  getPrice,
  connection,
  adminKeypair,
  gameStatePDA,
  gamesPDA,
  betsPDA,
  escrowTokenPDA,
  program,
} = require("./utils");
const { connectDB, User } = require("./db_connect");
const {
  Keypair,
  Connection,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  SystemProgram,
} = require("@solana/web3.js");
const bs58 = require("bs58");
const symbolToId = require("./simbol-map");

require("dotenv").config();

//  /bet more in one game by one user  , remainLoot drugde cuvati, duration correct

const MIN_AMOUNT = 0.001; // in SOL
const TOKEN = process.env.BOT_TOKEN;
const BENEFICIARY = process.env.BENEFICIARY;
const FEE_RATE = 0.05;
const bot = new TelegramBot(TOKEN, { polling: true });

connectDB();

let currentGames = {};
let gameID = 0;
let awaitingTokenInput = {}; // chatId => true/false
let remainLoot = 0;

function startBettingRound(chatId, username) {
  awaitingTokenInput[chatId] = true; // waiting for token

  bot.sendMessage(
    chatId,
    `🪙 *Choose a token to bet on:*
Solana, Bitcoin, Ethereum, etc.

📌 _Type the token name below to continue..._`,
    { parse_mode: "Markdown" }
  );

  bot.once("message", async (msg) => {
    const chatId = msg.chat.id;

    if (!awaitingTokenInput[chatId]) return;

    const rep = msg.text.trim();
    let tokenName = rep.toLowerCase();
    const price = await getPrice(tokenName);

    const tokenInput = tokenName.toUpperCase();

    let coinId = symbolToId[tokenInput];

    if (coinId) {
      tokenName = coinId;
    }

    console.log("Price data:", price[tokenName]?.usd.toFixed(6));

    if (!price || !price[tokenName]) {
      bot.sendMessage(chatId, "❌ Invalid token name. Please try again.", {
        reply_markup: {
          inline_keyboard: [[{ text: "📋 Menu", callback_data: "menu" }]],
        },
      });

      return;
    }

    awaitingTokenInput[chatId] = false;
    const totalTokens = 0;
    const duration = 5 * 60 * 1000;
    const endTime = Date.now() + duration;

    try {
      //const clock = await connection.getClock();
      const startTime = Math.floor(currentTime / 1000);
      const contractEndTime = startTime + 300; // 5 minutes

      //  SOL mint address
      const tokenMint = new PublicKey(
        "So11111111111111111111111111111111111111112"
      );

      const tx = await program.methods
        .createGame(tokenMint, startTime, contractEndTime)
        .accounts({
          gameState: gameStatePDA,
          games: gamesPDA,
          admin: adminKeypair.publicKey,
        })
        .signers([adminKeypair])
        .rpc();

      console.log(`Game created on contract. TX: ${tx}`);
    } catch (error) {
      console.error("Failed to create contract game:", error);
      bot.sendMessage(
        chatId,
        "⚠️ Failed to initialize on-chain game. Please try again."
      );
      return;
    }

    const newGame = {
      id: gameID++,
      isActive: true,
      tokenName,
      totalTokens,
      bets: [],
      endTime,
    };

    currentGames[newGame.id] = newGame;

    const timeString = `5m 0s`;

    const text = `📌 A new 5-minute betting round has started!\n
  🔥 Game ID: ${newGame.id}
  📈 Token: ${tokenName.toUpperCase()}
  💰 Total tokens in pool: ${remainLoot.toFixed(4)} 
  ⏳ Time remaining: ${timeString}
  💵 Current price: ${price[tokenName].usd} USD
  
  📥 To place a prediction, use:
  /bet [gameId] [amount] [prediction] (long or short)
  
  Example: /bet ${newGame.id} 0.5 long`;

    bot.sendMessage(chatId, text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ℹ️ Help", callback_data: "help" }],
          [{ text: "📊 Status", callback_data: "status" }],
          [{ text: "📋 Menu", callback_data: "menu" }],
          [{ text: "🔗 Connect wallet", callback_data: "connect" }],
        ],
      },
    });

    setTimeout(
      async () => await finishGame(chatId, newGame, price, tokenName),
      duration / 5
    );
  });
}

async function finishGame(chatId, game, startPrice, tokenName) {
  const endPrice = await getPrice(tokenName);
  console.log("End price data:", endPrice[tokenName].usd.toFixed(6));

  game.isActive = false;

  // Determine the winner based on the bets and reset currentGame

  const longBets = game.bets.filter((bet) => bet.prediction === "long");
  const shortBets = game.bets.filter((bet) => bet.prediction === "short");

  let resultText = `⏱️ Time is up! The betting round has ended.
      🔥 Game ID: ${game.id}
      📈 Token: ${game.tokenName.toUpperCase()}
      💰 Total tokens in pool: ${game.totalTokens} (+BONUS ${remainLoot}) SOL
      
    `;

  if (!longBets.length && !shortBets.length) {
    resultText +=
      "❌ No bets placed. Game No." + game.id + " ended without winners.";

    return;
  }

  const endGameTx = await program.methods
    .endGame(
      game.id, // ID from contract
      Math.round(startPrice[tokenName].usd * 100), // convernt to integer (e.g., $1.23 -> 123)
      Math.round(endPrice[tokenName].usd * 100)
    )
    .accounts({
      gameState: gameStatePDA,
      games: gamesPDA,
      admin: adminKeypair.publicKey,
    })
    .signers([adminKeypair])
    .rpc();

  let winningBets = [];
  let priceChange =
    ((endPrice[tokenName]?.usd - startPrice[tokenName]?.usd) /
      startPrice[tokenName]?.usd) *
    100;
  priceChange = priceChange.toFixed(4);

  if (endPrice[game.tokenName].usd > startPrice[game.tokenName].usd) {
    // Long wins
    winningBets = longBets;

    resultText += `\n 🏆 Game No.${game.id} ended! ${tokenName} price increased by ${priceChange}%!\n📈 Congratulations to all who went LONG!\n\n`;
  } else {
    // Short wins
    winningBets = shortBets;

    resultText += `\n 🏆 Game No.${
      game.id
    } ended! ${tokenName} price decreased by ${Math.abs(
      priceChange
    )}%!\n 📉 Congratulations to all who went SHORT!\n\n`;
  }

  if (winningBets.length === 0) {
    remainLoot += game.totalTokens;
    bot.sendMessage(
      chatId,
      `❌ No winning bets in this round. Total pot of ${game.totalTokens} SOL will roll over to the next game.End price ${endPrice[tokenName].usd}\n`
    );
    return;
  }

  let totalWinningBetAmount = 0;

  for (const bet of winningBets) {
    totalWinningBetAmount += bet.amount;
  }

  let winnersList = "";

  winningBets.sort((a, b) => b.amount - a.amount);

  const winningTransactions = [];

  for (const bet of winningBets) {
    const proportion = bet.amount / totalWinningBetAmount; // example: 0.3 / (0.5 + 0.2 + 0.3) = 0.3/1 = 0.3
    const winnings = (game.totalTokens + remainLoot) * proportion;
    let winningsRounded = Math.floor(winnings * 1000000) / 1000000; // in lamports

    try {
      const user = await User.findOne({ userId: bet.userId });
      if (!user?.wallet?.publicKey) continue;

      const distributeTx = await program.methods
        .distributeWinnings(game.id)
        .accounts({
          gameState: gameStatePDA,
          games: gamesPDA,
          bets: betsPDA,
          winner: new PublicKey(user.wallet.publicKey),
          winnerTokenAccount: user.wallet.publicKey,
          escrowTokenAccount: escrowTokenPDA,
          escrowAuthority: escrowAuthorityPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          admin: adminKeypair.publicKey,
        })
        .remainingAccounts([
          {
            pubkey: new PublicKey(user.wallet.publicKey),
            isWritable: true,
            isSigner: false,
          },
        ])
        .rpc();

      console.log(`Distributed to ${bet.user}. TX: ${distributeTx}`);
    } catch (error) {
      console.error(`Failed to distribute to ${bet.user}:`, error);
    }
    winningTransactions.push({
      userId: bet.userId,
      user: bet.user,
      amount: bet.amount,
      winnings: Number(winningsRounded.toFixed(6)),
    });

    winnersList += ` \t• @${bet.user}: ${bet.amount} SOL bet → ${winningsRounded} SOL prize\n`;
  }

  // Pay users
  for (const tx of winningTransactions) {
    try {
      await updateUserBalance(tx.userId, tx.winnings);
    } catch (error) {
      console.error(`Failed to send winnings to user ${tx.user}:`, error);
      bot.sendMessage(
        chatId,
        `❌ Failed to send ${tx.winnings} SOL to @${tx.user}. Please contact us with /support.`
      );
    }
  }

  resultText += `💰 Winnings distribution (total pot: ${game.totalTokens} SOL):\n${winnersList}\n\nThank you for playing!`;

  delete currentGames[game.id];

  bot.sendMessage(chatId, resultText, {
    reply_markup: {
      inline_keyboard: [[{ text: "📋 Menu", callback_data: "menu" }]],
    },
  });
}

async function updateUserBalance(userId, winnings) {
  try {
    const user = await User.findOne({ userId });
    if (!user) {
      console.error("User not found:", userId);
      return false;
    }
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const publicKey = new PublicKey(user.wallet.publicKey);

    const winningsLamports = Math.floor(winnings * LAMPORTS_PER_SOL);
    const balanceLamports = await connection.getBalance(publicKey);
    const newBalanceLamports = Math.floor(balanceLamports + winningsLamports);

    await User.findOneAndUpdate(
      { userId },
      { balance: newBalanceLamports },
      { new: true }
    );

    return true;
  } catch (error) {
    console.error("Error updating user balance:", error);
    return false;
  }
}

async function showStatus(chatId) {
  //console.log(Object.keys(currentGames).length);
  if (Object.keys(currentGames).length === 0) {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📊 Status", callback_data: "status" }],
          [{ text: "📋 Menu", callback_data: "menu" }],
        ],
      },
    };
    bot.sendMessage(chatId, "📊 No active game at the moment.", options);
  } else {
    for (const [gameId, currentGame] of Object.entries(currentGames)) {
      if (currentGame.isActive) {
        const price = await getPrice(currentGame.tokenName);

        const timeLeftMs = currentGame.endTime - Date.now();
        const timeLeftMin = Math.floor(timeLeftMs / 60000);
        const timeLeftSec = Math.floor((timeLeftMs % 60000) / 1000);

        const timeString =
          timeLeftMs > 0 ? `${timeLeftMin}m ${timeLeftSec}s` : ` Time is up!`;

        let text = `📊 Current Game Status:
          🔥 Game ID: ${currentGame.id}
          📈 Token: ${currentGame.tokenName.toUpperCase()}
          💵 Current price: ${price[currentGame.tokenName].usd} USD
          💰 Total tokens in pool: ${
            currentGame.totalTokens
          } (BONUS ${remainLoot.toFixed(4)})
          ⏳ Time remaining: ${timeString}\n`;

        for (let i = 0; i < currentGame.bets.length; i++) {
          text += `\nBet #${i + 1}: ${currentGame.bets[i].amount} SOL on ${
            currentGame.bets[i].prediction
          } by ${currentGame.bets[i].user}`;
        }

        const options = {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📊 Status", callback_data: "status" }],
              [{ text: "📋 Menu", callback_data: "menu" }],
            ],
          },
        };

        bot.sendMessage(chatId, text, options);
      }
    }
  }
}

function showMenu(chatId) {
  const menuText = `📌 Available commands:

  /betstart – Start a new 5-minute betting round  
  /help – Show game instructions  
  /status – View current game status  
  /menu – Show this menu again
  /connect – Connect a wallet 
  /wallet - Check your wallet
  /balance - Check your balance

  🗳 When a game starts, a poll will be posted where you can vote on the future token price.  
  💰 To participate, vote in the poll (your vote is your prediction).  
  🏆 After 5 minutes, the bot will determine who was right and award the winners!`;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎯 Start Game", callback_data: "betstart" }],
        [{ text: "ℹ️ Help", callback_data: "help" }],
        [{ text: "📊 Status", callback_data: "status" }],
        [{ text: "🔗 Connect wallet", callback_data: "connect" }],
        [{ text: "📋 Menu", callback_data: "menu" }],
      ],
    },
  };

  bot.sendMessage(chatId, menuText, options);
}

async function placeBet(chatId, user, userId, gameId, amount, prediction) {
  // Check functions
  if (Object.keys(currentGames).length === 0) {
    bot.sendMessage(
      chatId,
      "❌ No active game with ID. Please start a new game."
    );
    return;
  }

  const game = currentGames[gameId];

  if (!game || !game.isActive) {
    bot.sendMessage(chatId, `❌ No active game with ID ${gameId}.`);
    return;
  }
  if (amount <= MIN_AMOUNT) {
    bot.sendMessage(
      chatId,
      "❌ Invalid bet amount. Must be greater than " + MIN_AMOUNT + " SOL."
    );
    return;
  }

  if (prediction !== "long" && prediction !== "short") {
    bot.sendMessage(chatId, "❌ Invalid prediction. Use 'long' or 'short'.");
    return;
  }

  const existingBet = game.bets.find((b) => b.user === user);
  if (existingBet) {
    bot.sendMessage(
      chatId,
      `❌ You already placed a bet of ${existingBet.amount} ${game.tokenName} on ${existingBet.prediction}.`
    );
    return;
  }

  const userRecord = await User.findOne({ userId: userId });
  if (!userRecord || !userRecord.wallet) {
    bot.sendMessage(
      chatId,
      `🚫 You don't have a wallet connected yet.\n` +
        `Use /connect to generate and link your Solana wallet.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  // SOL to lamports
  const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);

  try {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const userPublicKey = new PublicKey(userRecord.wallet.publicKey);
    const userKeypair = Keypair.fromSecretKey(
      Uint8Array.from(userRecord.wallet.secretKey)
    );

    const balance = await connection.getBalance(userPublicKey);
    if (balance < amountLamports) {
      return bot.sendMessage(
        chatId,
        `❌ Insufficient balance! You need ${amount} SOL but only have ${
          balance / 1e9
        } SOL.`
      );
    }

    const predictionEnum = prediction === "long" ? { long: {} } : { short: {} };
    const explorerUrl = "";

    try {
      const txSig = await program.methods
        .placeBet(new BN(gameId), predictionEnum, new BN(amountLamports))
        .accounts({
          gameState: gameStatePDA,
          games: gamesPDA,
          bets: betsPDA,
          user: userPublicKey,
          escrow_token_account: escrowTokenPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([userKeypair])
        .rpc();

      explorerUrl = `https://explorer.solana.com/tx/${txSig}?cluster=devnet`;

      // Optional: update your in-memory or MongoDB game tracking here
      bot.sendMessage(chatId, `✅ Bet placed!\n🔗 [Explorer](${explorerUrl})`, {
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("placeBet error:", error);
      bot.sendMessage(chatId, `❌ Failed to place bet:\n${error.message}`);
    }

    game.bets.push({
      user,
      userId,
      amount,
      prediction,
      txHash: txSignature,
    });
    game.totalTokens += amount;

    const options = {
      reply_markup: {
        inline_keyboard: [[{ text: "📊 Status", callback_data: "status" }]],
      },
    };

    // Update user balance in the database
    await User.findOneAndUpdate(
      { userId },
      {
        balance: balance - amountLamports,
      },
      { upsert: true, new: true }
    );

    await bot.sendMessage(
      chatId,
      `✅ Bet placed successfully!\n` +
        `📌 Game ID: ${gameId}\n` +
        `💰 Amount: ${amount} SOL\n` +
        `📈 Prediction: ${prediction.toUpperCase()}\n\n` +
        `👤 User: @${user}\n\n` +
        `🔗 Transaction: [View on Explorer](${explorerUrl})`,
      options
    );
  } catch (error) {
    console.error("Bet placement error:", error);
    bot.sendMessage(
      chatId,
      `❌ Failed to place bet: ${error.message}\n\nPlease try again later.`
    );
  }
}

async function createWallet(chatId, userId, username) {
  try {
    const user = await User.findOne({ userId });

    if (user && user.wallet) {
      // User already has a wallet
      return bot.sendMessage(
        chatId,
        `You already have a wallet connected!\n\n` +
          `🔑 Your wallet address:\n` +
          `\`${user.wallet.publicKey}\`\n` +
          `👤 For user: @${username}\n\n` +
          `To deposit SOL for betting, send SOL to this address and then use /bet command in the group chat.`,
        { parse_mode: "Markdown" }
      );
    }

    // Generate new Solana wallet
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const secretKey = Array.from(keypair.secretKey);
    await User.findOneAndUpdate(
      { userId },
      {
        username,
        wallet: {
          publicKey,
          secretKey,
        },
      },
      { upsert: true, new: true }
    );

    await bot.sendMessage(
      chatId,
      `🎉 Your Solana wallet has been created!\n\n` +
        `🔑 Your wallet address:\n` +
        `\`${publicKey}\`\n` +
        `For user: @${username}\n\n` +
        `To start betting in the group:\n` +
        `1. Send SOL to this address (any amount)\n` +
        `2. Go to the group chat and use /bet command\n\n` +
        `⚠️ *Important:* Never share your private key! This bot stores it securely for you.`,
      { parse_mode: "Markdown" }
    );

    await bot.sendMessage(
      chatId,
      `ℹ️ Need help getting SOL?\n` +
        `1. Buy SOL on an exchange like Binance or Coinbase\n` +
        `2. Withdraw to your wallet address above\n` +
        `3. You're ready to bet!`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("Error in /connect command:", error);
    bot.sendMessage(
      chatId,
      `❌ Error creating your [@${username}] wallet. Please try again later.`
    );
  }
}

async function displayWallet(chatId, userId, username) {
  try {
    const user = await User.findOne({ userId });

    if (!user || !user.wallet || !user.wallet.publicKey) {
      return bot.sendMessage(
        chatId,
        `🚫 You [@${username}] don't have a wallet connected yet.\n` +
          `Use /connect to generate and link your Solana wallet.`,
        { parse_mode: "Markdown" }
      );
    }

    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "💰 Balance", callback_data: "balance" }],
          [{ text: "📋 Menu", callback_data: "menu" }],
        ],
      },
    };

    bot.sendMessage(
      chatId,
      `\n🔑 Your wallet address:\n` +
        `\`${user.wallet.publicKey}\`\n\n` +
        `👤 For user: @${username}\n\n`,

      { parse_mode: "Markdown" },
      options
    );
  } catch (error) {
    console.error("Error in /wallet command:", error);
    bot.sendMessage(
      chatId,
      `❌ Error retrieving your [@${username}] wallet. Please try again later.`
    );
  }
}

async function displayBalance(chatId, userId, username) {
  try {
    const user = await User.findOne({ userId });

    if (!user || !user.wallet || !user.wallet.publicKey) {
      return bot.sendMessage(
        chatId,
        `🚫 You [@${username}] don't have a wallet connected yet.\n` +
          `Use /connect to generate and link your Solana wallet.`,
        { parse_mode: "Markdown" }
      );
    }
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed"); // or 'mainet-beta'
    const publicKey = new PublicKey(user.wallet.publicKey);
    const balanceLamports = await connection.getBalance(publicKey);
    const balanceSol = balanceLamports / 1e9;

    // update after deposit
    if (balanceLamports > user.balance)
      await User.findOneAndUpdate(
        { userId },
        {
          balance: balanceLamports,
        },
        { upsert: true, new: true }
      );

    bot.sendMessage(
      chatId,
      `💰 [@${username}] current balance:\n` + `*${balanceSol.toFixed(6)} SOL*`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("Error in /balance command:", error);
    bot.sendMessage(
      chatId,
      `❌ Error retrieving your [@${username}] balance. Please try again later.`
    );
  }
}

bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username;

  displayBalance(chatId, userId, username);
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const options = {
    reply_markup: {
      inline_keyboard: [[{ text: "📋 Menu", callback_data: "menu" }]],
    },
  };

  bot.sendMessage(
    chatId,
    "🎲 Welcome to Solana Bet Bot! 🚀\n\nPlace your bets with $SOL in this group! Fast, fun, and fully on-chain.\n\n🔹 How to play?\n\n1. Use /connect to create your wallet\n2. Deposit SOL to your wallet address\n3. Start betting game with /betstart.\n4. Send /bet [gameId] [amount] [prediction]\n5. The bot settles winners automatically!\n\n💰 Win big, pay fast – all powered by Solana!\n\nType /menu for options. Let's roll! 🎯",
    options
  );
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const options = {
    reply_markup: {
      inline_keyboard: [[{ text: "📋 Menu", callback_data: "menu" }]],
    },
  };

  bot.sendMessage(
    chatId,
    "ℹ️ Use /betstart ( or Start Game button) to begin. A poll will appear.\n Connect your wallet with /connect and use commands /wallet and / balance for info. \n Predict the token price with /bet [gameId] [amount] [prediction] and win!\n\n💡 Example: /bet 1 10 short\n\nℹ️ Need help getting SOL?\n1. Buy SOL on an exchange like Binance or Coinbase\n2. Withdraw to your wallet address above\n3. You're ready to bet!\n\n💰 The winers share the prize!\n\n",
    options
  );
});

bot.onText(/\/support/, (msg) => {
  const chatId = msg.chat.id;
  const options = {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[{ text: "📋 Menu", callback_data: "menu" }]],
    },
  };

  bot.sendMessage(
    chatId,
    `📩 If you have any questions, feedback, or encounter any issues, please don't hesitate to contact our support team at:\n\n📧 **hugemerlin91@gmail.com**\n\nWe're here to assist you as soon as possible.`,
    options
  );
});

bot.onText(/\/menu/, (msg) => {
  const chatId = msg.chat.id;
  showMenu(chatId);
});

bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  showStatus(chatId);
});

bot.onText(/\/bet (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const user =
    msg.from.username ||
    `${msg.from.first_name} ${msg.from.last_name || ""}`.trim();
  const userId = msg.from.id;

  const input = match[1].trim().split(" ");
  if (input.length !== 3) {
    returnbot.sendMessage(
      chatId,
      "❌ Invalid format.\nUse /bet [gameId] [amount in SOL] [prediction]\nExample: /bet 1 0.5 short"
    );
  }
  placeBet(
    chatId,
    user,
    userId,
    parseInt(input[0]),
    parseFloat(input[1]),
    input[2]
  );
});

bot.onText(/\/betstart/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;

  startBettingRound(chatId, username);
});

bot.onText(/^\/bet$/, async (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    "❌ Invalid format.\nUse /bet [gameId] [amount in SOL] [prediction]\nExample: /bet 1 0.5 short"
  );
});

bot.onText(/\/connect/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username;

  createWallet(chatId, userId, username);
});

bot.onText(/\/wallet/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username;

  displayWallet(chatId, userId, username);
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const username = query.from.username;

  const data = query.data;

  if (data === "betstart") {
    startBettingRound(chatId);
  } else if (data === "help") {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📊 Status", callback_data: "status" }],
          [{ text: "📋 Menu", callback_data: "menu" }],
        ],
      },
    };

    bot.sendMessage(
      chatId,
      "ℹ️ Use /betstart ( or Start Game button) to begin. A poll will appear.\nConnect your wallet with /connect and use commands /wallet and / balance for info. \n Predict the token price with /bet [gameId] [amount] [prediction] and win!\n\n💡 Example: /bet 1 10 short\n\nℹ️ Need help getting SOL?\n1. Buy SOL on an exchange like Binance or Coinbase\n2. Withdraw to your wallet address above\n3. You're ready to bet!\n\n💰 The winers share the prize!\n\n",
      options
    );
  } else if (data === "status") {
    showStatus(chatId);
  } else if (data === "menu") {
    showMenu(chatId);
  } else if (data === "connect") {
    createWallet(chatId, userId, username);
  } else if (data === "balance") {
    displayBalance(chatId, userId);
  } else if (data.startsWith("cancel_")) {
    const [_, gameId, userId] = data.split("_");
    bot.sendMessage(query.message.chat.id, `Bet cancelled for game ${gameId}`);
  } else {
    bot.sendMessage(chatId, "❓ Unknown command. Please use /menu.");
  }

  bot.answerCallbackQuery(query.id);
});

bot.on("polling_error", (error) => {
  console.log(`[polling_error_debug] ${error.code}: ${error.message}`);
});

module.exports = { bot, currentGames };
