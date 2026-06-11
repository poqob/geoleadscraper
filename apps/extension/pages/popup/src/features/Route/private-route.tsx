import React from 'react';

type PrivateRouteProps = {
  children: React.ReactNode;
};

/**
 * Auth removed — everything is freely accessible. Kept as a pass-through so the
 * router config doesn't need to change.
 */
export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  return <>{children}</>;
};
