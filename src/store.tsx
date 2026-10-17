import Icon from './Icon';
import Loader from './Loader';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { getStoredToken, getApiErrorMessage, noticesApi, usersApi, type AddPetRequest, type CurrentUser } from './api';
import { petNoticeFromApi, userPetsFromApi, userProfileFromApi, type PetNotice, type UserPetRecord, type UserProfile } from './models';
import { profileChanged, sessionCleared, store, userLoaded, type AppDispatch, type RootState } from './session';

interface AppStore {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  favoriteIds: string[];
  favoriteNotices: PetNotice[];
  viewedNotices: PetNotice[];
  userPets: UserPetRecord[];
  refreshUser: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<boolean>;
  addUserPet: (pet: AddPetRequest) => Promise<void>;
  removeUserPet: (id: string) => Promise<void>;
  clearPrivateData: () => void;
  notifyError: (message: string) => void;
}

const AppStoreContext = createContext<AppStore | null>(null);

export function useAppStore() {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error('AppStoreProvider is missing');
  return store;
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <AppStoreContent>{children}</AppStoreContent>
    </Provider>
  );
}

function AppStoreContent({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const { currentUser, favoriteNotices, viewedNotices, userPets } = useSelector((state: RootState) => state.session);
  const [isReady, setIsReady] = useState(false);
  const [startupProgress, setStartupProgress] = useState(0);
  const [error, setError] = useState('');
  const pendingFavorites = useRef(new Set<string>());

  const applyUser = useCallback((user: CurrentUser) => {
    dispatch(userLoaded({
      currentUser: userProfileFromApi(user),
      favoriteNotices: (user.noticesFavorites || []).map((notice) => petNoticeFromApi(notice)),
      viewedNotices: (user.noticesViewed || []).map((notice) => petNoticeFromApi(notice)),
      userPets: userPetsFromApi(user.pets)
    }));
  }, [dispatch]);

  const setCurrentUser = useCallback((user: UserProfile | null) => {
    dispatch(profileChanged(user));
  }, [dispatch]);

  const clearPrivateData = useCallback(() => {
    dispatch(sessionCleared());
    pendingFavorites.current.clear();
  }, [dispatch]);

  const notifyError = useCallback((message: string) => {
    setError(message);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    const user = await usersApi.full();
    if (getStoredToken() === token) applyUser(user);
  }, [applyUser]);

  useEffect(() => {
    let active = true;
    const token = getStoredToken();
    const picture = new Image();
    const imageReady = new Promise<void>(resolve => {
      picture.onload = () => resolve();
      picture.onerror = () => resolve();
      picture.src = `${import.meta.env.BASE_URL}images/loading.webp`;
    });
    const tasks: Promise<unknown>[] = [imageReady, document.fonts.ready];
    if (token) tasks.push(usersApi.full().then(user => {
      if (active && getStoredToken() === token) applyUser(user);
    }).catch(reason => {
      if (active) setError(getApiErrorMessage(reason, 'Unable to restore your session. Please try again.'));
    }));
    let completed = 0;
    Promise.allSettled(tasks.map(task => task.finally(() => {
      completed += 1;
      if (active) setStartupProgress(completed / tasks.length * 100);
    }))).then(() => { if (active) setIsReady(true); });
    return () => { active = false; };
  }, [applyUser]);

  useEffect(() => {
    const onExpired = () => {
      clearPrivateData();
      setError('Your session has expired. Please log in again.');
    };
    window.addEventListener('petlove:session-expired', onExpired);
    return () => window.removeEventListener('petlove:session-expired', onExpired);
  }, [clearPrivateData]);

  const toggleFavorite = async (id: string) => {
    if (!currentUser || pendingFavorites.current.has(id)) return false;
    pendingFavorites.current.add(id);
    try {
      if (favoriteNotices.some((notice) => notice.id === id)) {
        await noticesApi.removeFavorite(id);
      } else {
        await noticesApi.addFavorite(id);
      }
      await refreshUser();
      return true;
    } catch (reason) {
      setError(getApiErrorMessage(reason, 'Unable to update favorites. Please try again.'));
      return false;
    } finally {
      pendingFavorites.current.delete(id);
    }
  };

  const addUserPet = async (pet: AddPetRequest) => {
    const token = getStoredToken();
    const user = await usersApi.addPet(pet);
    if (token && getStoredToken() === token) applyUser(user);
  };

  const removeUserPet = async (id: string) => {
    try {
      const token = getStoredToken();
      const user = await usersApi.removePet(id);
      if (token && getStoredToken() === token) applyUser(user);
    } catch (reason) {
      setError(getApiErrorMessage(reason, 'Unable to remove this pet. Please try again.'));
    }
  };

  if (!isReady) return <Loader progress={startupProgress} />;

  return (
    <AppStoreContext.Provider value={{ currentUser, setCurrentUser, favoriteIds: favoriteNotices.map((notice) => notice.id), favoriteNotices, viewedNotices, userPets, refreshUser, toggleFavorite, addUserPet, removeUserPet, clearPrivateData, notifyError }}>
      {error && <div className="app-notification" role="alert"><span>{error}</span><button className="notification-dismiss" type="button" aria-label="Dismiss notification" onClick={() => setError('')}><Icon name="modal-close" width="24" height="24" /></button></div>}
      {children}
    </AppStoreContext.Provider>
  );
}
