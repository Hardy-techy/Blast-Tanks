import React, { useEffect, useState, useRef } from 'react';
import { readContract } from 'thirdweb';
import { useActiveAccount } from 'thirdweb/react';
import { getLeaderboardContract, LEADERBOARD_CONTRACT_ADDRESS } from '@/lib/leaderboardContract';
import { motion } from 'framer-motion';

type LeaderboardEntry = {
    address: string;
    kills: number;
    deaths: number;
    xp: number;
    matches: number;
};

export default function LeaderboardTab() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const account = useActiveAccount();
    const reactivitySub = useRef<any>(null);

    const fetchLeaderboard = async () => {
        try {
            if ((LEADERBOARD_CONTRACT_ADDRESS as string) === "0x0000000000000000000000000000000000000000") {
                setError("Leaderboard contract not deployed yet. Deploy BlastLeaderboard.sol and update the address in leaderboardContract.ts");
                setLoading(false);
                return;
            }

            const contract = getLeaderboardContract();
            const result: any = await readContract({
                contract,
                method: "getTopPlayers",
                params: [BigInt(20)],
            });

            const [addresses, kills, deaths, xps, matches] = result;
            const parsed: LeaderboardEntry[] = [];
            for (let i = 0; i < addresses.length; i++) {
                parsed.push({
                    address: addresses[i],
                    kills: Number(kills[i]),
                    deaths: Number(deaths[i]),
                    xp: Number(xps[i]),
                    matches: Number(matches[i]),
                });
            }
            setEntries(parsed);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch leaderboard:', err);
            setError("Failed to fetch leaderboard data");
        } finally {
            setLoading(false);
        }
    };

    // Set up Somnia Reactivity WebSocket for real-time updates
    useEffect(() => {
        fetchLeaderboard();

        // Try to set up real-time WebSocket subscription
        const setupReactivity = async () => {
            try {
                if ((LEADERBOARD_CONTRACT_ADDRESS as string) === "0x0000000000000000000000000000000000000000") return;

                const { SDK: ReactivitySDK } = await import('@somnia-chain/reactivity');
                const { createPublicClient, webSocket, defineChain } = await import('viem');

                const somniaChain = defineChain({
                    id: 50312,
                    name: 'Somnia Testnet',
                    network: 'testnet',
                    nativeCurrency: { decimals: 18, name: 'STT', symbol: 'STT' },
                    rpcUrls: {
                        default: {
                            http: ['https://dream-rpc.somnia.network'],
                            webSocket: ['wss://dream-rpc.somnia.network/ws'],
                        },
                        public: {
                            http: ['https://dream-rpc.somnia.network'],
                            webSocket: ['wss://dream-rpc.somnia.network/ws'],
                        },
                    },
                });

                const publicClient = createPublicClient({
                    chain: somniaChain,
                    transport: webSocket(),
                });

                const sdk = new ReactivitySDK({ public: publicClient });

                reactivitySub.current = await sdk.subscribe({
                    eventContractSources: [LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`],
                    ethCalls: [],
                    onData: () => {
                        // When any ScoreSubmitted event fires, refetch the leaderboard
                        console.log('[Reactivity] Score update detected, refreshing leaderboard...');
                        fetchLeaderboard();
                    },
                    onError: (err) => {
                        console.warn('[Reactivity] WebSocket error, falling back to polling:', err);
                    },
                });

                console.log('[Reactivity] Leaderboard subscription active ✓');
            } catch (err) {
                console.warn('[Reactivity] Could not connect, using manual refresh:', err);
            }
        };

        setupReactivity();

        return () => {
            // Clean up subscription on unmount
            if (reactivitySub.current?.unsubscribe) {
                reactivitySub.current.unsubscribe();
            }
        };
    }, []);

    const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    if (loading) {
        return (
            <div className="text-center text-gray-400 py-8">
                <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-toonks-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>Loading leaderboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-yellow-500 text-sm mb-4">{error}</p>
                <button
                    onClick={() => { setLoading(true); fetchLeaderboard(); }}
                    className="text-toonks-orange underline hover:text-toonks-orangeLight"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="text-center text-gray-400 py-8">
                <svg className="h-12 w-12 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-bold text-lg text-gray-900 dark:text-white">No scores yet!</p>
                <p className="text-sm mt-1">Play a match to be the first on the leaderboard.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Global Leaderboard</h2>
                <button
                    onClick={() => { setLoading(true); fetchLeaderboard(); }}
                    className="text-sm text-toonks-orange hover:text-toonks-orangeLight"
                >
                    ↻ Refresh
                </button>
            </div>
            <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                        <th className="px-2 py-2">#</th>
                        <th className="px-2 py-2">Player</th>
                        <th className="px-2 py-2 text-center">Kills</th>
                        <th className="px-2 py-2 text-center">Deaths</th>
                        <th className="px-2 py-2 text-center">Matches</th>
                        <th className="px-2 py-2 text-right text-toonks-orange">XP</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry, i) => {
                        const isMe = account?.address?.toLowerCase() === entry.address.toLowerCase();
                        return (
                            <motion.tr
                                key={entry.address}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`border-b border-gray-200/50 dark:border-gray-800/50 ${isMe ? 'bg-toonks-orange/20' : ''}`}
                            >
                                <td className={`px-2 py-2 font-bold ${i === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>
                                    {i + 1}
                                </td>
                                <td className="px-2 py-2 font-mono text-gray-900 dark:text-white">
                                    {truncateAddress(entry.address)}
                                    {isMe && <span className="ml-2 text-xs text-toonks-orange">(you)</span>}
                                </td>
                                <td className="px-2 py-2 text-center font-mono text-gray-700 dark:text-gray-300">{entry.kills}</td>
                                <td className="px-2 py-2 text-center font-mono text-gray-700 dark:text-gray-300">{entry.deaths}</td>
                                <td className="px-2 py-2 text-center font-mono text-gray-700 dark:text-gray-300">{entry.matches}</td>
                                <td className="px-2 py-2 text-right font-bold text-toonks-orange font-mono">{entry.xp}</td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
