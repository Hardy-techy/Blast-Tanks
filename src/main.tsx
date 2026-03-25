import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import GameRenderer from '@/routes/GameRenderer';
import '@/global.css';
import Root from '@/routes/root/Root';
import MultiplayerTab from '@/routes/root/tab/MultiplayerTab';
import QuickPlayTab from '@/routes/root/tab/QuickPlayTab';
import LeaderboardTab from '@/routes/root/tab/LeaderboardTab';
import SkinsTab from '@/routes/root/tab/SkinsTab';
import WagerTab from '@/routes/root/tab/WagerTab';
import { ThirdwebProvider } from 'thirdweb/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<Analytics />
		<ThirdwebProvider>
			<BrowserRouter>
				<Routes>
					<Route path='/' element={<Root />}>
						<Route index element={<MultiplayerTab />} />
						<Route path='join/:code?' element={<MultiplayerTab />} />
						<Route path='quickplay' element={<QuickPlayTab />} />
						<Route path='skins' element={<SkinsTab />} />
						<Route path='wager' element={<WagerTab />} />
						<Route path='leaderboard' element={<LeaderboardTab />} />
					</Route>
					<Route path='/game' element={<GameRenderer />} />
				</Routes>
			</BrowserRouter>
		</ThirdwebProvider>
	</React.StrictMode>,
);
