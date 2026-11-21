import type { HeavenSave } from './types';

export class DivineResourceSystem {
  static spendPower(state:HeavenSave, amount:number){if(!Number.isFinite(amount)||amount<0||state.divinePower<amount)return false;state.divinePower-=amount;return true}
  static awardPower(state:HeavenSave, amount:number){if(!Number.isFinite(amount)||amount<0)return false;state.divinePower=Math.min(state.divinePowerMax,state.divinePower+amount);return true}
  static spendFragments(state:HeavenSave, amount:number){if(!Number.isInteger(amount)||amount<0||state.fragments<amount)return false;state.fragments-=amount;return true}
  static awardFragments(state:HeavenSave, amount:number){if(!Number.isInteger(amount)||amount<0)return false;state.fragments+=amount;return true}
}
