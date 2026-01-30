import { clearChargeState } from '../services/chargeState.js';
import myAccountHandler from './myAccount.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  
  clearChargeState(userId);
  
  await myAccountHandler(ctx);
};

