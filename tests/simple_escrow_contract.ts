import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SimpleEscrow } from "../target/types/simple_escrow";

describe("simple_escrow_contract", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.simpleEscrowContract as Program<SimpleEscrow>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize("gameId123").rpc();
    console.log("Your transaction signature", tx);
  });
});
