import { fork, take, call, put, actionChannel, select } from 'redux-saga/effects';
import { buffers } from 'redux-saga';
import hash from 'object-hash';

import { reduxSagaFirebase } from '../../gateways/firebase';
import { actions as walletActions } from '../../wallet';
import { SignatureSuccess } from '../../wallet/redux/actions/external';
import * as challengeActions from '../../wallet/redux/actions/challenge';
import { encode, decode, Player, positions } from '../../core';
import * as gameActions from '../game/actions';
import { MessageState } from '../game/reducer';
import * as gameStates from '../game/state';
import { Channel, State } from 'fmg-core';

export enum Queue {
  WALLET = 'WALLET',
  GAME_ENGINE = 'GAME_ENGINE',
}

export default function* messageSaga(address: string) {
  yield fork(receiveFromFirebaseSaga, address);
  yield fork(receiveFromWalletSaga);
}

export function* sendMessagesSaga(opponentAddress: string) {
  const channel = yield actionChannel('*');

  while (true) {
    // We take any action that might trigger the outbox to be updated
    const action = yield take(channel);

    if (action.type === walletActions.SEND_MESSAGE) {
      const queue = Queue.WALLET;
      const { data } = action;
      const message = { data, queue };
      yield call(reduxSagaFirebase.database.create, `/messages/${opponentAddress.toLowerCase()}`, message);
    } else {
      // TODO: Select the actual state once it's wired up.
      const getMessageState = state => ({});
      const messageState: MessageState = yield select(getMessageState);
      if (messageState.opponentOutbox != null) {
        const queue = Queue.GAME_ENGINE;
        const data = encode(messageState.opponentOutbox);
        const signature = yield signMessage(data);
        const message = { data, queue, signature };
        yield put(walletActions.messageSent(data, signature));
        yield call(reduxSagaFirebase.database.create, `/messages/${opponentAddress.toLowerCase()}`, message);
      }
      if (messageState.walletOutbox != null) {
        const getGameState = state => ({});
        const gameState: gameStates.GameState = yield select(getGameState);
        handleWalletMessage(messageState.walletOutbox, gameState);
      }
    }
  }
}

function* receiveFromFirebaseSaga(address: string) {
  address = address.toLowerCase();
  const channel = yield call(
    reduxSagaFirebase.database.channel,
    `/messages/${address}`,
    'child_added',
    buffers.fixed(10),
  );

  while (true) {
    const message = yield take(channel);
    const key = message.snapshot.key;

    const { data, queue } = message.value;

    if (queue === Queue.GAME_ENGINE) {
      const { signature } = message.value;
      const validMessage = yield validateMessage(data, signature);
      if (!validMessage) {
        // TODO: Handle this
      }
      yield put(walletActions.messageReceived(data, signature));
      const position = decode(data);
      if (position.name === positions.PRE_FUND_SETUP_A) {
        // todo: how do we get actual names in here - will need to look up from firebase
        yield put(gameActions.initialPositionReceived(position, 'Me', 'Opponent'));
      } else {
        yield put(gameActions.positionReceived(position));
      }
    } else {
      yield put(walletActions.receiveMessage(data));
    }
    yield call(reduxSagaFirebase.database.delete, `/messages/${address}/${key}`);
  }
}
function* handleWalletMessage(type, state: gameStates.GameState) {
  const { libraryAddress, channelNonce, player, balances, participants } = state;
  const channel = new Channel(libraryAddress, channelNonce, participants);
  const channelId = channel.id;

  switch (type) {
    case "FUNDING_REQUEST":

      const myIndex = player === Player.PlayerA ? 0 : 1;

      const opponentAddress = participants[1 - myIndex];
      const myAddress = participants[myIndex];
      const myBalance = balances[myIndex];
      const opponentBalance = balances[1 - myIndex];

      yield put(walletActions.fundingRequest(channelId, myAddress, opponentAddress, myBalance, opponentBalance, myIndex));
      yield take(walletActions.FUNDING_SUCCESS);
      break;
    case "WITHDRAWAL_REQUEST":
      const { turnNum } = positions.conclude(state);
      const channelState = new State({
        channel,
        stateType: State.StateType.Conclude,
        turnNum,
        resolution: balances,
        stateCount: 0,
      });
      yield put(walletActions.withdrawalRequest(channelState));
      yield take(walletActions.WITHDRAWAL_SUCCESS);

  }
}

function* receiveFromWalletSaga() {
  while (true) {
    const { position } = yield take(challengeActions.SEND_CHALLENGE_POSITION);
    yield put(gameActions.positionReceived(position));
  }
}

function* validateMessage(data, signature) {
  const requestId = hash(data + Date.now());
  yield put(walletActions.validationRequest(requestId, data, signature));
  const actionFilter = [walletActions.VALIDATION_SUCCESS, walletActions.VALIDATION_FAILURE];
  let action: walletActions.ValidationResponse = yield take(actionFilter);
  while (action.requestId !== requestId) {
    action = yield take(actionFilter);
  }
  if (action.type === walletActions.VALIDATION_SUCCESS) {
    return true;
  } else {
    // TODO: Properly handle this.
    throw new Error("Signature Validation error");
  }
}

function* signMessage(data) {
  const requestId = hash(data + Date.now());

  yield put(walletActions.signatureRequest(requestId, data));
  // TODO: Handle signature failure
  const actionFilter = walletActions.SIGNATURE_SUCCESS;
  let signatureResponse: SignatureSuccess = yield take(actionFilter);
  while (signatureResponse.requestId !== requestId) {
    signatureResponse = yield take(actionFilter);
  }
  return signatureResponse.signature;
}
