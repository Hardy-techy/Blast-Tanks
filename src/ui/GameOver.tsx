import React, { useEffect, useRef, useState } from 'react';
import { useMatchStore, useNetwork } from '@/store/store';
import Button from '@/ui/Button';
import clsx from 'clsx';
import type Game from '@game/scenes/Game';
import { motion } from 'framer-motion';
import { useActiveAccount } from 'thirdweb/react';
import { prepareContractCall, sendTransaction } from 'thirdweb';
import { getLeaderboardContract, LEADERBOARD_CONTRACT_ADDRESS } from '@/lib/leaderboardContract';

import { useNavigate } from 'react-router-dom';

export default function GameOver({ game }: { game: Game }) {
    const navigate = useNavigate();
    const { state } = useMatchStore();
    const { network, code, isWager } = useNetwork();
    const account = useActiveAccount();
    const hasSubmitted = useRef(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    const stats = state === 'OVER'
        ? game.tanks.array.map(tank => ({
            pseudo: tank.pseudo,
            kills: tank.kills,
            deaths: tank.deaths,
            xp: tank.xp,
            isLocal: tank.uuid === game.player?.uuid,
        })).sort((a, b) => b.xp - a.xp)
        : [];

    const localStats = stats.find(s => s.isLocal);

    // Auto-submit score on-chain when match ends
    useEffect(() => {
        if (state !== 'OVER' || !account || hasSubmitted.current || !localStats) return;

        hasSubmitted.current = true;
        setSubmitStatus('submitting');

        const submitOnChain = async () => {
            try {
                // Check if this room is an active Wager match
                let isWager = false;
                let wagerAmount = 0n;
                
                try {
                    const wagerContract = (await import('@/lib/wagerContract')).getWagerContract();
                    const { readContract } = await import('thirdweb');
                    const details: any = await readContract({
                        contract: wagerContract,
                        method: "getRoomDetails",
                        params: [code || ''],
                    });
                    if (details[3] === true) { // active
                        isWager = true;
                        wagerAmount = BigInt(details[0]);
                    }
                } catch (e) {
                    // Ignore, probably not a wager room or contract missing
                }

                if (isWager) {
                    const wagerContract = (await import('@/lib/wagerContract')).getWagerContract();
                    const tx = prepareContractCall({
                        contract: wagerContract,
                        method: "submitScore",
                        params: [code || '', BigInt(localStats.kills)],
                    });
                    await sendTransaction({ transaction: tx, account });
                    setSubmitStatus('success');
                    console.log('[Wager] Score submitted to Wager escrow ✓');
                } else {
                    const contract = getLeaderboardContract();
                    const tx = prepareContractCall({
                        contract,
                        method: "submitScore",
                        params: [BigInt(localStats.kills), BigInt(localStats.deaths), BigInt(localStats.xp)],
                    });
                    await sendTransaction({ transaction: tx, account });
                    setSubmitStatus('success');
                    console.log('[Leaderboard] Score submitted on-chain ✓');
                }
            } catch (err) {
                console.error('[Blockchain] Failed to submit score:', err);
                setSubmitStatus('error');
            }
        };

        submitOnChain();
    }, [state, account, localStats]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (state === 'OVER' && e.key === 'Escape') {
                network?.disconnect();
                navigate('/');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state, network, navigate]);

    if (state !== 'OVER') return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md'
        >
            <motion.h1
                initial={{ scale: 0.8, y: -50 }}
                animate={{ scale: 1, y: 0 }}
                className='mb-8 text-6xl font-black text-white drop-shadow-2xl text-toonks-orange'
            >
                MATCH OVER
            </motion.h1>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className='w-full max-w-2xl rounded-2xl bg-slate-900/90 p-8 shadow-2xl border border-slate-700/50'
            >
                <table className='w-full text-left text-lg text-gray-300'>
                    <thead className='text-sm uppercase text-gray-400 border-b border-gray-700'>
                        <tr>
                            <th className='px-4 py-3'>Player</th>
                            <th className='px-4 py-3 text-center'>Kills</th>
                            <th className='px-4 py-3 text-center'>Deaths</th>
                            <th className='px-4 py-3 text-right text-toonks-orange'>XP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((s, i) => (
                            <tr key={i} className={clsx('border-b border-gray-800/50', { 'bg-toonks-orange/20': s.isLocal })}>
                                <td className='px-4 py-4 font-bold text-white'>
                                    {i === 0 && <span className='mr-2 text-yellow-500 font-extrabold text-sm'>1ST</span>}
                                    {s.pseudo}
                                </td>
                                <td className='px-4 py-4 text-center font-mono'>{s.kills}</td>
                                <td className='px-4 py-4 text-center font-mono'>{s.deaths}</td>
                                <td className='px-4 py-4 text-right font-bold text-toonks-orange font-mono'>+{s.xp}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* On-chain submission status */}
                <div className='mt-4 text-center text-sm space-y-1'>
                    {submitStatus === 'submitting' && (
                        <span className='text-yellow-400 animate-pulse'>Saving results on-chain...</span>
                    )}
                    {submitStatus === 'success' && (
                        <>
                            <div className='text-green-400'>Results saved on Somnia blockchain!</div>
                            {!isWager && localStats && localStats.kills > 0 && (
                                <div className='text-orange-400 font-bold animate-pulse'>
                                    +{localStats.kills} $BLAST earned!
                                </div>
                            )}
                            {isWager && (
                                <div className='text-orange-400 font-bold animate-pulse'>
                                    Wager results submitted — winner takes the pot!
                                </div>
                            )}
                        </>
                    )}
                    {submitStatus === 'error' && (
                        <span className='text-red-400'>Failed to save on-chain. Check wallet.</span>
                    )}
                </div>

                <div className='mt-8 pt-4 border-t border-gray-800 text-center'>
                    <p className='text-gray-500 text-sm'>Press Esc to exit</p>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className='mt-12'
            >
                <Button
                    onClick={() => {
                        network?.disconnect();
                        navigate('/');
                    }}
                >
                    Return to Main Menu
                </Button>
            </motion.div>
        </motion.div>
    );
}
