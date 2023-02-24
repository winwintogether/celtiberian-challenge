import { createBrowserHistory, History } from 'history';
import { routerMiddleware } from 'connected-react-router';
import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import createSagaMiddleware from 'redux-saga';

import newspaperSaga from "@redux/sagas/newspaper";
import publisherSaga from "@redux/sagas/publisher";
import createRootReducer from './reducers';


const history: History = createBrowserHistory();
const sagaMiddleware = createSagaMiddleware();
const middleware = [routerMiddleware(history), thunk, sagaMiddleware];

const store = createStore(createRootReducer(history), compose(applyMiddleware(...middleware)));

sagaMiddleware.run(publisherSaga);
sagaMiddleware.run(newspaperSaga);

export { history };

export default store;
