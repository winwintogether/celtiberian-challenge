import React, { Suspense } from 'react';
import { Switch, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ConnectedRouter } from 'connected-react-router';

import store, { history } from '../redux/store';

const Home = React.lazy(() => import('../screens/home/Home'));

const publicPaths = [{ exact: true, path: '/', component: Home }];

const publicRoutes = publicPaths.map(({ path, ...props }) => (
  <Route key={path} path={path} {...props} />
));

export default () => (
  <Provider store={store}>
    <ConnectedRouter history={history}>
      <Switch>
        <Suspense fallback={<div />}>
          {publicRoutes}
        </Suspense>
      </Switch>
    </ConnectedRouter>
  </Provider>
);
