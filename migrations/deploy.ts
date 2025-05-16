import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SimpleEscrowContract } from "../target/types/simple_escrow_contract"; 

module.exports = async function (provider: anchor.AnchorProvider) {
  // Set the provider.
  anchor.setProvider(provider);

  // Load the program ID from the workspace.
  const program = anchor.workspace.MyProgram as Program<SimpleEscrowContract>;

  // Optionally, if your program has an initialization instruction, you can call it here.
  // For example:
  // await program.methods.initialize()
  //   .accounts({
  //     // your accounts here
  //   })
  //   .rpc();

  console.log("Program deployed with ID:", program.programId.toBase58());
};