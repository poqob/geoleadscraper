import React, { ReactNode } from 'react';

/**
 * Auth has been removed — the extension is free and works without an account.
 * This provider is kept as a no-op pass-through for backwards compatibility
 * with existing layouts.
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
