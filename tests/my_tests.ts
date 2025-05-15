// import * as anchor from "@project-serum/anchor";
// import { Program } from "@project-serum/anchor";
// import { SimpleEscrow } from "../target/types/simple_escrow";

// describe("simple_escrow", () => {
//   const provider = anchor.AnchorProvider.local();
//   anchor.setProvider(provider);

//   const program = anchor.workspace.SimpleEscrow as Program<SimpleEscrow>;

//   it("Initializes the escrow", async () => {
//     const [escrowPda] = await anchor.web3.PublicKey.findProgramAddressSync(
//       [Buffer.from("game123")],
//       program.programId
//     );

//     await program.methods.initialize("game123").accounts({
//       escrow: escrowPda,
//       authority: provider.wallet.publicKey,
//       systemProgram: anchor.web3.SystemProgram.programId,
//     }).rpc();

//     console.log("Escrow initialized:", escrowPda.toBase58());
//   });
// });
