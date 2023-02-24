import { combineReducers } from 'redux';
import { connectRouter } from 'connected-react-router';
import { History } from 'history';

import newspapers from './newspaper';
import publishers from './publisher';
import { IReducerStates } from "../../schemas/ReducerStates";

export default (history: History) =>
  combineReducers<IReducerStates>({
    newspapers,
    publishers,
    router: connectRouter(history)
  });
