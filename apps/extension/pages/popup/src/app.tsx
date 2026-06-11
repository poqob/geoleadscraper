import { Suspense } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import '@chrome-extension/shared/styles/styles.css';
import './app.css';

import { withErrorBoundary, withSuspense, AuthProvider, AppProvider } from '@chrome-extension/shared';

import { routes } from './router';
import { Layout } from './layout';
import { PrivateRoute } from './features';

const App = () => {
  return (
    <AppProvider>
      <AuthProvider>
        <Router>
          <Layout>
            <Suspense fallback={<></>}>
              <Routes>
                {routes.map(({ path, element: Element, fallback, redirect, ...route }) => (
                  <Route
                    key={path}
                    path={path}
                    element={
                      route.private ? (
                        <PrivateRoute>{Element ? <Element /> : fallback}</PrivateRoute>
                      ) : redirect ? (
                        <Navigate to={redirect} replace />
                      ) : Element ? (
                        <Element />
                      ) : (
                        fallback
                      )
                    }
                    errorElement={fallback}
                  />
                ))}
              </Routes>
            </Suspense>
          </Layout>
        </Router>
      </AuthProvider>
    </AppProvider>
  );
};

export default withErrorBoundary(withSuspense(App, <div> Loading ... </div>), <div> Error Occur </div>);
