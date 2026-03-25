import { client, somniaTestnet } from "./thirdweb";
import { getContract, prepareContractCall, sendTransaction, readContract } from "thirdweb";

// Updated with deployed Wager address
export const WAGER_CONTRACT_ADDRESS = "0x6be14c9c3191dF902973124cF61349613397207B";

// Minimal ABI for Wager
export const WAGER_CONTRACT_ABI = [
  {
    "type": "function",
    "name": "hostRoom",
    "inputs": [
      { "name": "roomIdStr", "type": "string" },
      { "name": "wagerAmount", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "joinRoom",
    "inputs": [
      { "name": "roomIdStr", "type": "string" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "submitScore",
    "inputs": [
      { "name": "roomIdStr", "type": "string" },
      { "name": "kills", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getRoomDetails",
    "inputs": [
      { "name": "roomIdStr", "type": "string" }
    ],
    "outputs": [
      { "name": "amount", "type": "uint256" },
      { "name": "p1", "type": "address" },
      { "name": "p2", "type": "address" },
      { "name": "active", "type": "bool" }
    ],
    "stateMutability": "view"
  }
] as const;

export function getWagerContract() {
    return getContract({
        client,
        chain: somniaTestnet,
        address: WAGER_CONTRACT_ADDRESS,
        abi: WAGER_CONTRACT_ABI,
    });
}
