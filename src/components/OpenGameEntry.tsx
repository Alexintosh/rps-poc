import React from "react";
import { State } from "fmg-core";
import { Button } from "reactstrap";

import BN from 'bn.js';
import web3Utils from 'web3-utils';
import { OpenGame } from "src/redux/open-games/state";

interface Props {
  openGame: OpenGame;
  joinOpenGame: (
    myName: string,
    myAddress: string,
    opponentName: string,
    opponentAddress: string,
    libraryAddress: string,
    channelNonce: number,
    roundBuyIn: BN,
  ) => void;
}

export class OpenGameEntry extends React.PureComponent<Props, State> {
  render() {
    const { openGame, joinOpenGame } = this.props;
    const joinThisGame = () => joinOpenGame(
      'TODO myName',
      'TODO myAddress',
      openGame.name,
      openGame.address,
      'TODO libraryAddress',
      5,
      openGame.stake);

    return (
      <div className="oge-container">
        <p>{openGame.name}</p>
        <p>Buy in {web3Utils.fromWei(openGame.stake.toString(), 'finney')}</p>
        <Button onClick={joinThisGame}>Join</Button>
      </div>

    );
  }
}
