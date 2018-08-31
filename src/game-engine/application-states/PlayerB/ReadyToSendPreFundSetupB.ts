import BasePlayerB from './Base';
import { Position } from '../../positions';

export default class ReadyToSendPreFundSetupB extends BasePlayerB {
  position: Position;
  readonly isReadyToSend = true;

  constructor({ channel, stake, balances, position }) {
    super({ channel, stake, balances });
    this.position = position;
  }
}
