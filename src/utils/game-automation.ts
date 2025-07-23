import cron from 'node-cron';
import { Game } from '../models/game.model';
import { ManualOverride } from '../models/manual-override.model';
import { Bid } from '../models/bid.model';
import { Wallet } from '../models/wallet.model';
import { WalletTransaction } from '../models/wallet-transaction.model';



function getCurrentTimeWindow(): string {
  const now = new Date();
  const minutes = now.getMinutes();
  const slot = Math.floor(minutes / 30) * 30;
  now.setMinutes(slot, 0, 0);
  return now.toISOString();
}

async function createGameIfNotExists() {
  const timeWindow = getCurrentTimeWindow();
  const exists = await Game.findOne({ timeWindow });
  if (!exists) {
    await Game.create({ timeWindow, status: 'open', totalPool: 0 })
    // eslint-disable-next-line no-console
    console.log('Game created for window', timeWindow);
  }
}

async function processGameResults() {
  // Find games in 'open' status whose window ended >=25min ago
  const now = new Date();
  const cutoff = new Date(now.getTime() - 25 * 60 * 1000);
  const games = await Game.find({ status: 'open', createdAt: { $lte: cutoff } });
  for (const game of games) {
    // Check for manual override
    const override = await ManualOverride.findOne({ game: game._id });
    if (override) {
      game.resultNumber = override.winnerNumber;
      game.status = 'result';
      await game.save();
      // Payout manual winners
      for (const userId of override.manualWinners) {
        const bid = await Bid.findOne({ game: game._id, user: userId, bidNumber: override.winnerNumber });
        if (bid) {
          await payoutWinner(userId.toString(), bid.bidAmount, game, override.payoutMultiplier || 2);
        }
      }
      // eslint-disable-next-line no-console
      console.log('Manual override applied for game', game._id);
      continue;
    }
    // Auto result logic: lowest unique bid with payout < total pool
    const bids = await Bid.find({ game: game._id });
    const bidMap: Record<number, string[]> = {};
    for (const bid of bids) {
      if (!bidMap[bid.bidNumber]) bidMap[bid.bidNumber] = [];
      bidMap[bid.bidNumber].push(bid.user.toString());
    }
    let winnerNumber: number | null = null;
    let winnerUser: string | null = null;
    for (let n = 1; n <= 12; n++) {
      if (bidMap[n] && bidMap[n].length === 1) {
        // Unique bid
        const bid = bids.find((b:any) => b.bidNumber === n);
        if (bid && (bid.bidAmount * 2) <= game.totalPool) {
          winnerNumber = n;
          winnerUser = bid.user.toString();
          break;
        }
      }
    }
    if (winnerNumber && winnerUser) {
      game.resultNumber = winnerNumber;
      game.status = 'result';
      await game.save();
      await payoutWinner(winnerUser, bids.find((b:any) => b.user.toString() === winnerUser && b.bidNumber === winnerNumber)!.bidAmount, game, 2);
      // eslint-disable-next-line no-console
      console.log('Auto result for game', game._id, 'winner', winnerUser, 'number', winnerNumber);
    } else {
      game.status = 'result';
      await game.save();
      // eslint-disable-next-line no-console
      console.log('No winner for game', game._id);
    }
  }
}

async function payoutWinner(userId: string, amount: number, game: any, multiplier: number) {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId });
  const payout = amount * multiplier;
  wallet.main += payout;
  await wallet.save();
  await WalletTransaction.create({
    user: userId,
    initiator: null,
    initiatorRole: 'admin',
    amount: payout,
    walletType: 'main',
    type: 'bonus',
    note: `Game win payout for game ${game._id}`,
  });
}

export function initGameAutomation() {
  // Create game every 30 minutes at :00 and :30
  cron.schedule('0,30 * * * *', createGameIfNotExists);
  // Process results every 5 minutes
  cron.schedule('*/5 * * * *', processGameResults);
  // eslint-disable-next-line no-console
  console.log('Game automation started');
} 