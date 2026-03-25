import React, { useEffect, useState } from 'react';
import { ConnectButton, useActiveAccount, useWalletBalance, useWalletDetailsModal } from 'thirdweb/react';
import { readContract, getContract } from 'thirdweb';
import { client, somniaTestnet } from '@/lib/thirdweb';
import { BLAST_TOKEN_ADDRESS, BLAST_TOKEN_ABI } from '@/lib/blastToken';

export default function UnifiedWalletButton() {
    const account = useActiveAccount();
    const [blastBalance, setBlastBalance] = useState<string | null>(null);
    const detailsModal = useWalletDetailsModal();

    // Fetch native STT balance
    const { data: nativeBalanceData } = useWalletBalance({
        client,
        chain: somniaTestnet,
        address: account?.address,
    });

    // Fetch custom BLAST token balance
    useEffect(() => {
        if (!account?.address) {
            setBlastBalance(null);
            return;
        }

        const fetchBalance = async () => {
            try {
                const contract = getContract({
                    client,
                    chain: somniaTestnet,
                    address: BLAST_TOKEN_ADDRESS,
                    abi: BLAST_TOKEN_ABI,
                });

                const raw: any = await readContract({
                    contract,
                    method: "balanceOf",
                    params: [account.address],
                });

                const formatted = (Number(raw) / 1e18).toFixed(2);
                setBlastBalance(formatted);
            } catch (err) {
                console.warn('[UnifiedWalletButton] Failed to fetch:', err);
                setBlastBalance('--');
            }
        };

        fetchBalance();
        const interval = setInterval(fetchBalance, 15000);
        return () => clearInterval(interval);
    }, [account?.address]);

    // If not connected, show default ConnectButton
    if (!account) {
        return (
            <ConnectButton 
                client={client} 
                chain={somniaTestnet}
                theme='dark'
                supportedTokens={{
                    [somniaTestnet.id]: [{
                        address: BLAST_TOKEN_ADDRESS,
                        name: "Blast",
                        symbol: "BLAST",
                    }]
                }}
            />
        );
    }

    // Format native balance to 4 decimals, handle loading states
    const sttFormatted = nativeBalanceData ? Number(nativeBalanceData.displayValue).toFixed(2) : '--';
    const blastFormatted = blastBalance !== null ? blastBalance : '--';

    return (
        <button 
            onClick={() => detailsModal.open({ client, theme: 'dark' })}
            className='flex items-center gap-3 rounded-[12px] bg-[#131418] border border-[#2b2d35] pl-2 pr-4 py-1.5 h-[50px] shadow-sm hover:border-[#383a42] transition-colors text-left font-sans'
        >
            <div className='w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shadow-inner flex-shrink-0'>
                {/* Simulated Avatar inside the custom button */}
            </div>
            <div className='flex flex-col justify-center'>
                <span className='text-[14px] font-semibold text-white leading-tight mb-0.5 tracking-tight'>
                    {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </span>
                <span className='text-[13px] text-gray-400 font-medium leading-none flex items-center gap-1.5'>
                    <span>{sttFormatted} STT</span>
                    <span className='text-gray-600 font-normal'>|</span>
                    <span className='text-orange-400'>{blastFormatted} BLAST</span>
                </span>
            </div>
        </button>
    );
}
