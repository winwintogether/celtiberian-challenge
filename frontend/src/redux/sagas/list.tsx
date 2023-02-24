import { takeLatest, call, put } from 'redux-saga/effects';
import { FETCH_LIST_REQUEST, FETCH_LIST_SUCCESS, FETCH_LIST_FAILURE } from '../actions';
import * as API from '../api';

export default [takeLatest(FETCH_LIST_REQUEST, fetchList)];

type FetchList = {
  type: string;
  payload: {
    resolve: (list: INewspaper[]) => void;
    reject: (error: string) => void;
  };
};

function* fetchList({ payload: { resolve, reject } }: FetchList) {
  try {
    const list: INewspaper[] = yield call(API.getNewspapers);

    resolve(list);

    yield put({ type: FETCH_LIST_SUCCESS, payload: list });
  } catch (error) {
    reject(error as string);

    yield put({ type: FETCH_LIST_FAILURE, payload: error });
  }
}
