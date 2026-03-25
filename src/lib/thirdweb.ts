import { createThirdwebClient, defineChain } from "thirdweb";

export const client = createThirdwebClient({
    clientId: "6c2a77ab4417808359d76352c44299c8",
});

// Somnia Testnet Chain configuration
export const somniaTestnet = defineChain(50312);
