import { ReactNode, useState } from 'react';
import { AppContext, IAppContextState } from './../../context';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<IAppContextState>({});

  return (
    <AppContext.Provider
      value={{
        state,
        setState: callback => {
          setState(state => ({ ...state, ...callback(state) }));
        },
      }}>
      {children}
    </AppContext.Provider>
  );
};
