import { storage } from './../lib/storage';
import { useStorage } from './use-storage';

export const useStore = () => {
  const state = useStorage(storage);
  const update = storage.update;

  return { state, update };
};
