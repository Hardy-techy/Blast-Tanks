import React, { useState } from 'react';
import { useNetwork, usePlayerSettings } from '@/store/store';
import Button from '@/ui/Button';
import { NetworkStatus } from '@game/network/Network';
import CodeInput from '@/ui/CodeInput';
import { useActiveAccount } from "thirdweb/react";
import { getBlastTokenContract } from '@/lib/blastToken';
import { getWagerContract, WAGER_CONTRACT_ADDRESS } from '@/lib/wagerContract';
import { prepareContractCall, sendTransaction, readContract } from "thirdweb";

export default function WagerTab() {
	const { status, hostGame, joinGame, setWager } = useNetwork();
	const { name, tank } = usePlayerSettings();
	const account = useActiveAccount();
	const [mode, setMode] = useState<'choose' | 'host' | 'join'>('choose');
	const [code, setCode] = useState('');
	const [wagerAmount, setWagerAmount] = useState('10'); // Default 10 BLAST
    const [txStatus, setTxStatus] = useState<string>('');

    // Ensure player approves $BLAST spending for the Wager contract
    const ensureApproval = async (amountInWei: bigint) => {
        if (!account) return false;
        
        const blastContract = getBlastTokenContract();
        setTxStatus('Checking allowance...');
        
        const allowance: any = await readContract({
            contract: blastContract,
            method: "allowance" as any,
            params: [account.address, WAGER_CONTRACT_ADDRESS] as any,
        });

        if (BigInt(allowance) < amountInWei) {
            setTxStatus('Approving $BLAST... (Check Wallet)');
            const tx = prepareContractCall({
                contract: blastContract,
                method: "approve" as any,
                params: [WAGER_CONTRACT_ADDRESS, amountInWei] as any,
            });
            await sendTransaction({ transaction: tx, account: account! });
        }
        return true;
    };

	const handleHostWager = async () => {
        if (WAGER_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
            setTxStatus("Developer needs to deploy BlastWager contract first.");
            return;
        }

        try {
            const amountInWei = BigInt(parseFloat(wagerAmount) * 1e18);
            await ensureApproval(amountInWei);

            // Generate a random room code
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		    const roomStr = Array.from({length: 6}, () => alphabet.at(Math.floor(Math.random() * alphabet.length))).join('');

            setTxStatus('Locking wager on-chain...');
            const wagerContract = getWagerContract();
            const tx = prepareContractCall({
                contract: wagerContract,
                method: "hostRoom",
                params: [roomStr, amountInWei],
            });
            await sendTransaction({ transaction: tx, account: account! });
            
            setTxStatus('Success! Creating Lobby...');
            setWager(true);
            
            // Host via PeerJS with custom code
            // (Note: Toonks uses automatic codes, but we need to pass our specific room string
            // We'll pass the room code as part of the join process)
            void hostGame({ name, tank, roomOverride: roomStr } as any);

        } catch (e: any) {
            console.error(e);
            setTxStatus('Error: ' + (e.message || 'Transaction failed'));
        }
	};

	const handleJoinWager = async () => {
         if (WAGER_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
            setTxStatus("Developer needs to deploy BlastWager contract first.");
            return;
        }

        try {
            setTxStatus('Reading room info...');
            const wagerContract = getWagerContract();
            const result: any = await readContract({
                contract: wagerContract,
                method: "getRoomDetails",
                params: [code],
            });

            if (!result[3]) { // result.active
                setTxStatus('Room is not active or does not exist.');
                return;
            }

            const amountInWei = BigInt(result[0]); // result.amount
            await ensureApproval(amountInWei);

            setTxStatus('Locking wager on-chain...');
            const tx = prepareContractCall({
                contract: wagerContract,
                method: "joinRoom",
                params: [code],
            });
            await sendTransaction({ transaction: tx, account: account! });

            setTxStatus('Success! Joining Lobby...');
            setWager(true);
            void joinGame(code, { name, tank });

        } catch (e: any) {
            console.error(e);
            setTxStatus('Error: ' + (e.message || 'Transaction failed or Room full'));
        }
	};

	if (mode === 'choose') {
		return (
			<div className='space-y-4'>
				<h2 className='text-center text-xl font-bold text-gray-900 dark:text-orange-500 flex items-center justify-center gap-2'>
					High Stakes Wager
				</h2>
                <p className='text-sm text-center text-gray-400'>Winner Takes All $BLAST</p>
				<Button onClick={() => { setMode('host'); setTxStatus(''); }} disabled={!account} fullWidth size='large'>
					{account ? 'Host Wager Match' : 'Wallet Required'}
				</Button>
				<Button onClick={() => { setMode('join'); setTxStatus(''); }} disabled={!account} fullWidth size='large'>
					{account ? 'Join Wager Match' : 'Wallet Required'}
				</Button>
			</div>
		);
	}

	if (mode === 'host') {
		return (
			<div className='space-y-4'>
				<button onClick={() => setMode('choose')} className='text-sm text-gray-400 hover:text-white'>
					← Back
				</button>
				<h2 className='text-center text-xl font-bold text-orange-500'>Host Wager Match</h2>
                <div>
                    <label className='block text-sm font-medium text-gray-300 mb-1'>Risk Amount ($BLAST)</label>
                    <input 
                        type="number" 
                        value={wagerAmount} 
                        onChange={(e) => setWagerAmount(e.target.value)}
                        className='w-full bg-gray-800 border border-orange-500/50 rounded-lg p-2 text-white focus:outline-none focus:border-orange-500' 
                        min="1"
                    />
                    <p className='text-xs text-gray-500 mt-1'>You and the opponent must put up this amount. Winner takes both.</p>
                </div>

                {txStatus && <div className='text-center text-sm text-yellow-500 animate-pulse'>{txStatus}</div>}

				<Button
					onClick={handleHostWager}
					loading={status === NetworkStatus.Connecting || txStatus.includes('...')}
					disabled={!account || parseFloat(wagerAmount) <= 0}
					fullWidth
					size='large'
				>
					Lock Wager & Create Room
				</Button>
			</div>
		);
	}

	return (
		<div className='space-y-4'>
			<button onClick={() => setMode('choose')} className='text-sm text-gray-400 hover:text-white'>
				← Back
			</button>
			<h2 className='text-center text-xl font-bold text-orange-500'>Join Wager Match</h2>
			<CodeInput value={code} onChange={setCode} length={6} className='mb-2' />
            <p className='text-xs text-center text-gray-500 mb-4'>The required $BLAST fee will be read from the blockchain automatically.</p>
			
            {txStatus && <div className='text-center text-sm text-yellow-500 animate-pulse'>{txStatus}</div>}

            <Button
				onClick={handleJoinWager}
				loading={status === NetworkStatus.Connecting || txStatus.includes('...')}
				disabled={!account || code.length !== 6}
				fullWidth
				size='large'
			>
				Lock Wager & Join
			</Button>
		</div>
	);
}
