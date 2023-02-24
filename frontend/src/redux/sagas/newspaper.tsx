import { takeLatest, call, put } from 'redux-saga/effects';

import {
  CREATE_NEWSPAPER_FAILURE,
  CREATE_NEWSPAPER_REQUEST,
  CREATE_NEWSPAPER_SUCCESS,
  DELETE_NEWSPAPER_FAILURE,
  DELETE_NEWSPAPER_REQUEST,
  DELETE_NEWSPAPER_SUCCESS,
  NEWSPAPER_LIST_FAILURE,
  NEWSPAPER_LIST_REQUEST,
  NEWSPAPER_LIST_SUCCESS,
  UPDATE_NEWSPAPER_FAILURE,
  UPDATE_NEWSPAPER_REQUEST,
  UPDATE_NEWSPAPER_SUCCESS
} from '../actions';
import * as API from '../api';

export default function* newspaperSaga(): Generator {
  yield takeLatest(NEWSPAPER_LIST_REQUEST, fetchList);
  yield  takeLatest(CREATE_NEWSPAPER_REQUEST, createNewspaper);
  yield  takeLatest(UPDATE_NEWSPAPER_REQUEST, updateNewspaper);
  yield  takeLatest(DELETE_NEWSPAPER_REQUEST, deleteNewspaper);
}

type CreateNewspaper = {
  type: string;
  payload: {
    newspaper: INewspaper
  };
};

type DeleteNewspaper = {
  type: string;
  payload: {
    id: string
  };
};

function* fetchList({ payload } : any) {
  try {
    const { data } = yield call(API.getNewspapers, payload);
    yield put({ type: NEWSPAPER_LIST_SUCCESS, payload: data });
  } catch (error) {
    yield put({ type: NEWSPAPER_LIST_FAILURE, payload: error });
  }
}


function* createNewspaper({ payload }: CreateNewspaper) {
  try {
    const newspaper: INewspaper = yield call(API.createNewspaper, payload.newspaper);
    yield put({
      type: CREATE_NEWSPAPER_SUCCESS,
      payload: {
        newspaper: {...payload.newspaper, _id: newspaper._id}
      }
    });
  } catch (error) {
    yield put({ type: CREATE_NEWSPAPER_FAILURE, payload: error });
  }
}

function* updateNewspaper({ payload }: CreateNewspaper) {
  try {
    const newspaper: INewspaper = yield call(API.updateNewspaper, payload.newspaper);
    yield put({ type: UPDATE_NEWSPAPER_SUCCESS, payload: newspaper });
  } catch (error) {
    yield put({ type: UPDATE_NEWSPAPER_FAILURE, payload: error });
  }
}

function* deleteNewspaper({ payload }: DeleteNewspaper) {
  try {
    const newspaper: INewspaper = yield call(API.deleteNewspaper, payload.id);
    yield put({ type: DELETE_NEWSPAPER_SUCCESS, payload: newspaper });
  } catch (error) {
    yield put({ type: DELETE_NEWSPAPER_FAILURE, payload: error });
  }
}
