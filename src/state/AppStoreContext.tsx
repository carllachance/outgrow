import { createContext, useContext } from 'react';
import { useAppStore } from './useAppStore';

type Store = ReturnType<typeof useAppStore>;

const AppStoreContext = createContext<Store | null>(null);

export const AppStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const store = useAppStore();
  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
};

export const useStore = () => {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error('useStore must be used inside AppStoreProvider');
  return store;
};
