import React, { useEffect, useState } from 'react';
import TankModel from '@/ui/TankModel';
import { Canvas } from '@react-three/fiber';
import { type TankType, TankTypeList } from '@game/models/TankType';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayerSettings } from '@/store/store';
import Button from '@/ui/Button';
import { useActiveAccount } from "thirdweb/react";
import { getSkinsContract, SKINS_CONTRACT_ADDRESS } from '@/lib/skinsContract';
import { getBlastTokenContract } from '@/lib/blastToken';
import { prepareContractCall, sendTransaction, readContract, waitForReceipt } from "thirdweb";
import { client, somniaTestnet } from '@/lib/thirdweb';

export default function SkinsTab() {
	const { name, tank, setName, setTank } = usePlayerSettings();
	const [index, setIndex] = useState(TankTypeList.findIndex(t => t.key === tank));
	const [direction, setDirection] = useState(1);
	const account = useActiveAccount();

    const [isOwned, setIsOwned] = useState(false);
    const [checkingOwnership, setCheckingOwnership] = useState(false);
    const [txStatus, setTxStatus] = useState('');
    const [dynamicPrice, setDynamicPrice] = useState<number | null>(null);

    const currentTank = TankTypeList[index];

    // Check ownership whenever the selected tank or account changes
    useEffect(() => {
        const checkOwnership = async () => {
             // If it's free, it's always "owned"
            if (!currentTank.value.premium) {
                setIsOwned(true);
                setTank(currentTank.key);
                setDynamicPrice(null);
                return;
            }

            if (!account) {
                 setIsOwned(false);
                 return;
            }

            if (SKINS_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
                // Not deployed yet
                setIsOwned(false);
                return;
            }

            try {
                setCheckingOwnership(true);
                const contract = getSkinsContract();
                const owned = await readContract({
                    contract,
                    method: "hasSkin",
                    params: [account.address, currentTank.key]
                }) as boolean;
                
                setIsOwned(owned);
                
                // Only set as active tank if they own it
                if (owned) {
                    setTank(currentTank.key);
                }

                // Fetch dynamic live price from Reactivity
                try {
                    const priceWei = await readContract({
                        contract,
                        method: "getSkinPrice" as any,
                        params: [currentTank.key]
                    }) as bigint;
                    setDynamicPrice(Number(priceWei) / 1e18);
                } catch(e) {
                    setDynamicPrice(currentTank.value.price || null);
                }

            } catch (e) {
                console.error("Failed to check ownership", e);
                setIsOwned(false);
                setDynamicPrice(currentTank.value.price || null);
            } finally {
                setCheckingOwnership(false);
            }
        };

        void checkOwnership();
    }, [index, account]);

	const nextTank = () => {
		setIndex((index + 1) % TankTypeList.length);
		setDirection(-1);
        setTxStatus('');
	};

	const prevTank = () => {
		setIndex((index - 1 + TankTypeList.length) % TankTypeList.length);
		setDirection(1);
        setTxStatus('');
	};

    const handleBuySkin = async () => {
        if (!account || !currentTank.value.price) return;
        
        try {
            const actualPrice = dynamicPrice || currentTank.value.price;
            const amountInWei = BigInt(actualPrice * 1e18);
            const blastContract = getBlastTokenContract();
            
            // 1. Check Allowance
            setTxStatus('Checking allowance...');
            const allowance: any = await readContract({
                contract: blastContract,
                method: "allowance" as any,
                params: [account.address, SKINS_CONTRACT_ADDRESS] as any,
            });

            // 2. Approve if needed
            if (BigInt(allowance) < amountInWei) {
                setTxStatus('Approving $BLAST... (Check Wallet)');
                const txApprove = prepareContractCall({
                    contract: blastContract,
                    method: "approve" as any,
                    params: [SKINS_CONTRACT_ADDRESS, amountInWei] as any,
                });
                const { transactionHash } = await sendTransaction({ transaction: txApprove, account: account });
                
                setTxStatus('Waiting for approval to confirm...');
                await waitForReceipt({
                    client,
                    chain: somniaTestnet,
                    transactionHash
                });
            }

            // 3. Buy Skin
            setTxStatus('Purchasing skin on-chain...');
            const skinsContract = getSkinsContract();
            const txBuy = prepareContractCall({
                contract: skinsContract,
                method: "buySkin",
                params: [currentTank.key],
            });
            const { transactionHash: buyHash } = await sendTransaction({ transaction: txBuy, account: account });

            setTxStatus('Waiting for purchase to confirm...');
            await waitForReceipt({
                client,
                chain: somniaTestnet,
                transactionHash: buyHash
            });

            setTxStatus('Success! Skin Unlocked.');
            setIsOwned(true);
            setTank(currentTank.key);

            setTimeout(() => setTxStatus(''), 3000);

        } catch(e: any) {
            console.error(e);
            setTxStatus('Error: ' + (e.message || 'Transaction failed'));
        }
    };

	return (
		<div className='space-y-4'>
			<h2 className='text-center text-xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2'>
				Garage
			</h2>
			<div className='bg-gradient-radial relative overflow-hidden rounded border border-gray-100/90 from-slate-900/80 to-gray-900/30 dark:border-gray-700/90'>
				<AnimatePresence mode={'popLayout'}>
					<motion.img
						key={currentTank.key}
						initial={{ opacity: 0 }}
						animate={{ opacity: 0.5 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.25 }}
						className='absolute inset-0 -z-10 h-full w-full object-cover object-[center_20%] opacity-50 blur-[1px]' src={currentTank.value.backdrop}
					/>
				</AnimatePresence>
				
                {/* 3D Canvas with optional grayscale filter if locked */}
                <AnimatePresence mode={'wait'}>
					<motion.div
						key={currentTank.key}
						initial={{ opacity: 0, x: -200 * direction }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: 200 * direction }}
						transition={{ duration: 0.25 }}
					>
						<Canvas camera={{ fov: 35, zoom: 1.5 }}>
							<TankModel type={currentTank.key} />
						</Canvas>
					</motion.div>
				</AnimatePresence>

                {/* Padlock overlay for locked premium tanks */}
                {!isOwned && !checkingOwnership && currentTank.value.premium && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <svg className="w-16 h-16 text-white drop-shadow-2xl opacity-80" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}

				<div className='flex flex-row items-center justify-between border border-gray-300 bg-white/70 leading-tight text-gray-500 shadow dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-400'>
					<span
						className='block cursor-pointer px-3 py-2 leading-tight text-gray-500 hover:bg-gray-100/90 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/90 dark:hover:text-white'
						onClick={prevTank}
					>
						<svg aria-hidden='true' className='h-5 w-5' fill='currentColor' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'>
							<path fillRule='evenodd' d='M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z' clipRule='evenodd'></path>
						</svg>
					</span>
					
                    <div className="flex flex-col items-center">
                        <h4 className='text-center font-bold flex items-center gap-2 leading-tight tracking-tight text-gray-900 dark:text-white'>
                            {currentTank.value.name}
                            {currentTank.value.premium && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${isOwned ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                    {isOwned ? 'Owned' : 'Premium'}
                                </span>
                            )}
                        </h4>
                    </div>

					<span
						className='block cursor-pointer px-3 py-2 leading-tight text-gray-500 hover:bg-gray-100/90 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/90 dark:hover:text-white'
						onClick={nextTank}
					>
						<svg aria-hidden='true' className='h-5 w-5' fill='currentColor' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'>
							<path fillRule='evenodd' d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z' clipRule='evenodd'></path>
						</svg>
					</span>
				</div>
			</div>

            {/* Status output */}
            {txStatus && <div className='text-center text-sm text-yellow-500 animate-pulse'>{txStatus}</div>}

            {/* Action Button: Either auto-saved, loading, or Buy Button */}
            {checkingOwnership ? (
                <p className='text-center text-sm text-gray-400 animate-pulse'>Checking local inventory...</p>
            ) : isOwned ? (
                 <p className='text-center text-sm text-green-400'>
                    Selection auto-saved. Ready for battle!
                </p>
            ) : (
                <Button 
                    fullWidth 
                    size="large" 
                    disabled={!account || txStatus.includes('...')} 
                    onClick={handleBuySkin}
                >
                    {account ? `Unlock for ${dynamicPrice || currentTank.value.price} $BLAST${dynamicPrice && dynamicPrice !== currentTank.value.price ? ' (Live Price!)' : ''}` : 'Wallet Required to Unlock'}
                </Button>
            )}
			
		</div>
	);
}
