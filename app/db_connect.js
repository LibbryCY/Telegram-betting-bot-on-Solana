const {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} = require("@solana/web3.js");

const { MongoClient, ServerClosedEvent } = require("mongodb");
const mongoose = require("mongoose");

// MongoDB connection URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/solbetting";

const userSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  telegramUsername: String,
  wallet: {
    publicKey: {
      type: String,
      validate: {
        validator: (v) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v),
        message: (props) => `${props.value} not valid Solana address!`,
      },
    },
    secretKey: [Number],
  },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

async function connectDB() {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

// Error handling
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

module.exports = { connectDB, User };
