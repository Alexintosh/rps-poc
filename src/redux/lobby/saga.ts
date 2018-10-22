import { fork, put, take, actionChannel, cps, } from 'redux-saga/effects';

import { reduxSagaFirebase } from '../../gateways/firebase';

import * as lobbyActions from './actions';
import * as applicationActions from '../application/actions';

import { createGame, enterWaitingRoom } from '../../redux/game/actions';
import BN from 'bn.js';

// @ts-ignore
import RPSGameArtifact from '../../../contracts/RockPaperScissorsGame.sol';

export default function* lobbySaga(address: string) {
  yield put(applicationActions.lobbySuccess());
  // subscribe to challenges
  yield* challengeSyncer();

  const channel = yield actionChannel([
    lobbyActions.ACCEPT_CHALLENGE,
    lobbyActions.CREATE_CHALLENGE,
  ]);

  while (true) {
    const action: lobbyActions.AnyAction = yield take(channel);
    switch (action.type) {
      case lobbyActions.ACCEPT_CHALLENGE:
        const libraryAddress = yield getLibraryAddress();
        const { stake, opponentName, opponentAddress } = action;
        const channelNonce = 0; // TODO: make random?
        yield put(createGame(
          'myName',
          '0x123',
          opponentName,
          opponentAddress,
          libraryAddress,
          channelNonce,
          stake,
        ));
        break;

      case lobbyActions.CREATE_CHALLENGE:
        yield put(enterWaitingRoom(action.name, action.stake));
        break;

      case lobbyActions.SYNC_CHALLENGES:
        // do nothing
        break;

      default:
      // todo: check unreachability
    }
  }
}

// maps { '0xabc': challenge1Data, ... } to [challenge1Data, ....]
const challengeTransformer = (dict) => {
  if (!dict.value) {
    return [];
  }
  return Object.keys(dict.value).map(key => {
    // Convert the stake from a string to a BN
    dict.value[key].stake = new BN(dict.value[key].stake);
    return dict.value[key];
  });
};

function* challengeSyncer() {
  yield fork(
    reduxSagaFirebase.database.sync,
    'challenges',
    {
      successActionCreator: lobbyActions.syncChallenges,
      transform: challengeTransformer,
    },
    'value',
  );
}
// TODO: This should be moved somewhere else
function* getLibraryAddress() {
  const selectedNetworkId = parseInt(yield cps(web3.version.getNetwork), 10);
  return RPSGameArtifact.networks[selectedNetworkId].address;
}

