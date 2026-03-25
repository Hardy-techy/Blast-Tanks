import { getContract } from "thirdweb";
import { client, somniaTestnet } from "./thirdweb";

// ========================================
// IMPORTANT: Replace this address after deploying
// BlastLeaderboard.sol to Somnia Testnet!
// ========================================
export const LEADERBOARD_CONTRACT_ADDRESS = "0xc70343667d292c3393491c4008e1bDd7cfe0D495";

export const LEADERBOARD_ABI = [
    {
        "type": "function",
        "name": "submitScore",
        "inputs": [
            { "name": "kills", "type": "uint256" },
            { "name": "deaths", "type": "uint256" },
            { "name": "xp", "type": "uint256" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getPlayerStats",
        "inputs": [{ "name": "player", "type": "address" }],
        "outputs": [
            { "name": "totalKills", "type": "uint256" },
            { "name": "totalDeaths", "type": "uint256" },
            { "name": "totalXP", "type": "uint256" },
            { "name": "matchesPlayed", "type": "uint256" }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getPlayerCount",
        "inputs": [],
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getTopPlayers",
        "inputs": [{ "name": "count", "type": "uint256" }],
        "outputs": [
            { "name": "addresses", "type": "address[]" },
            { "name": "kills", "type": "uint256[]" },
            { "name": "deaths", "type": "uint256[]" },
            { "name": "xps", "type": "uint256[]" },
            { "name": "matches", "type": "uint256[]" }
        ],
        "stateMutability": "view"
    },
    {
        "type": "event",
        "name": "ScoreSubmitted",
        "inputs": [
            { "name": "player", "type": "address", "indexed": true },
            { "name": "kills", "type": "uint256", "indexed": false },
            { "name": "deaths", "type": "uint256", "indexed": false },
            { "name": "xp", "type": "uint256", "indexed": false },
            { "name": "totalKills", "type": "uint256", "indexed": false },
            { "name": "totalDeaths", "type": "uint256", "indexed": false },
            { "name": "totalXP", "type": "uint256", "indexed": false },
            { "name": "matchesPlayed", "type": "uint256", "indexed": false }
        ]
    }
] as const;

export function getLeaderboardContract() {
    return getContract({
        client,
        chain: somniaTestnet,
        address: LEADERBOARD_CONTRACT_ADDRESS,
        abi: LEADERBOARD_ABI,
    });
}
