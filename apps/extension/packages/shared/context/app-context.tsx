import { createContext, useContext } from 'react';

export interface IAppContextState {
  user?: {
    email: string;
    name: string;
  };
}

interface IAppContext {
  state: IAppContextState;
  setState: (callback: (state: IAppContextState) => IAppContextState) => void;
}

export const AppContext = createContext<IAppContext | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
