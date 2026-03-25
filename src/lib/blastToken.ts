import { client, somniaTestnet } from "./thirdweb";
import { getContract } from "thirdweb";

// $BLAST Token on Somnia Testnet
export const BLAST_TOKEN_ADDRESS = "0x7f41952740040bA3030a34a7548c45Aac4663496";

// Minimal ERC-20 ABI for reading balance
export const BLAST_TOKEN_ABI = [
    {
        "type": "function",
        "name": "balanceOf",
        "inputs": [{ "name": "account", "type": "address" }],
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "symbol",
        "inputs": [],
        "outputs": [{ "name": "", "type": "string" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "decimals",
        "inputs": [],
        "outputs": [{ "name": "", "type": "uint8" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "allowance",
        "inputs": [
            { "name": "owner", "type": "address" },
            { "name": "spender", "type": "address" }
        ],
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "approve",
        "inputs": [
            { "name": "spender", "type": "address" },
            { "name": "amount", "type": "uint256" }
        ],
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "nonpayable"
    }
] as const;

export function getBlastTokenContract() {
    return getContract({
        client,
        chain: somniaTestnet,
        address: BLAST_TOKEN_ADDRESS,
        abi: BLAST_TOKEN_ABI,
    });
}
