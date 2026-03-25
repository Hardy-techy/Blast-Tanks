import { client, somniaTestnet } from "./thirdweb";
import { getContract } from "thirdweb";

export const SKINS_CONTRACT_ADDRESS = "0xCA3E4d110E33A89dC369e8cA9FD73290e18241Df";

export const SKINS_CONTRACT_ABI = [
  {
    "type": "function",
    "name": "getSkinPrice",
    "inputs": [{ "name": "skinId", "type": "string" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "buySkin",
    "inputs": [{ "name": "skinId", "type": "string" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "hasSkin",
    "inputs": [
      { "name": "", "type": "address" },
      { "name": "", "type": "string" }
    ],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  }
] as const;

export function getSkinsContract() {
    return getContract({
        client,
        chain: somniaTestnet,
        address: SKINS_CONTRACT_ADDRESS,
        abi: SKINS_CONTRACT_ABI,
    });
}
