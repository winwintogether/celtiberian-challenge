import { takeLatest, call, put } from 'redux-saga/effects';
import {
  PUBLISHER_LIST_FAILURE,
  PUBLISHER_LIST_REQUEST,
  PUBLISHER_LIST_SUCCESS
} from "@redux/actions/publisher";
import * as API from '../api';

export default function* publisherSaga(): Generator {
  yield takeLatest(PUBLISHER_LIST_REQUEST, getPublishers);
}

function* getPublishers() {
  try {
    const { data } = yield call(API.getPublishers);
    yield put({ type: PUBLISHER_LIST_SUCCESS, payload: data });
  } catch (error) {
    yield put({ type: PUBLISHER_LIST_FAILURE, payload: error });
  }
}
