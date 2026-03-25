import React, { useEffect, useState, useRef } from 'react';
import { initGame } from '@game/main';
import { useAudio, useNetwork, useMatchStore } from '@/store/store';
import GameUi from '@/ui/GameUi';
import GameOver from '@/ui/GameOver';
import LoadingScreen from '@/ui/LoadingScreen';
import { toast } from 'react-hot-toast';
import ConnectionToast from '@/ui/toast/ConnectionToast';
import { NetworkStatus } from '@game/network/Network';
import KillToast from '@/ui/toast/KillToast';
import HitToast from '@/ui/toast/HitToast';
import type Game from '@game/scenes/Game';
import { useNavigate } from 'react-router-dom';

export default function GameRenderer() {
    const navigate = useNavigate();
	const { network } = useNetwork();
	const [game, setGame] = useState<Game>();
	const [loading, setLoading] = useState(true);
	const [loadProgress, setLoadProgress] = useState(0);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const audio = useAudio();

	useEffect(() => {
		audio.fadeOut();
        
        // Reset match store to ensure it doesn't bleed from previous matches
        useMatchStore.getState().setMatchState(300000, 'PLAYING');

		if (!network) {
			navigate('/');
            return;
		}

		const { start, stop } = initGame();
		void start(canvasRef.current!, network!).then(async game => {
			setGame(game);

			// Subscribe to real loading progress from the game engine
			game.loadProgress.on('progress', (progress: number) => {
				setLoadProgress(progress);
			});

			network?.on('status', status => {
				if (status === NetworkStatus.Disconnected) {
					console.log('Disconnected from server, redirecting to home page');
					navigate('/');
				}
			});
			network?.on('join', name => {
				toast.custom(<ConnectionToast playerName={name} type='join' />);
			});
			network?.on('leave', name => {
				toast.custom(<ConnectionToast playerName={name} type='leave' />);
			});
			game.events.on('tank:kill', ({ killer, killed }) => {
				toast.custom(
					<KillToast killer={killer} killed={killed} />,
				);
			});
			game.events.on('tank:hit', ({ from, to, damage }) => {
				const playerA = game.tanks.get(from)?.pseudo ?? 'Unknown';
				const playerB = game.tanks.get(to)?.pseudo ?? 'Unknown';
				toast.custom(
					<HitToast from={playerA} to={playerB} damage={damage} />,
				);
			});
			game.events.on('sync:matchState', ({ time, state }) => {
				useMatchStore.getState().setMatchState(time, state);
			});
		});
		return () => {
			stop();
		};
	}, []);

	return (
		<div>
			<canvas ref={canvasRef} key='game-canvas' />
			{loading && <LoadingScreen progress={loadProgress} onComplete={() => setLoading(false)} />}
			{game && <GameUi game={game} />}
			{game && <GameOver game={game} />}
		</div>
	);
}

