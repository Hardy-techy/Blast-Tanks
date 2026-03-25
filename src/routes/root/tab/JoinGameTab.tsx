import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNetwork, usePlayerSettings } from '@/store/store';
import Button from '@/ui/Button';
import { NetworkStatus } from '@game/network/Network';
import CodeInput from '@/ui/CodeInput';
import { useActiveAccount } from "thirdweb/react";

export default function JoinGameTab() {
	const { status, joinGame } = useNetwork();
	const params = useParams<{ code?: string }>();
	const [code, setCode] = useState('');
	const account = useActiveAccount();

	const { name, tank } = usePlayerSettings();

	useEffect(() => {
		if (params.code) {
			setCode(params.code);
		}
	}, [params.code]);

	const handleJoinGame = () => {
		void joinGame(code, {
			name,
			tank,
		});
	};

	return (
		<div className='space-y-4 md:space-y-6'>
			<h2 className='text-center text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white md:text-2xl'>
				Enter Game ID
			</h2>
			<CodeInput
				value={code}
				onChange={setCode}
				length={6}
				className='mb-5'
			/>

			<Button
				onClick={handleJoinGame}
				loading={status === NetworkStatus.Connecting}
				disabled={!account || code.length !== 6}
				fullWidth
				size='large'
			>
				{account ? 'Join' : 'Wallet Required'}
			</Button>
		</div>
	);
}
