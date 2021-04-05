import { createContext, PropsWithChildren, useContext } from 'react';
import superagent from 'superagent';
import { apiErrorMessage, authRemember, useApi } from './api';
import { IUser } from './interfaces';

interface OsuAuth {
  logOut: () => Promise<void>;
  user?: IUser;
}

const authContext = createContext<OsuAuth | undefined>(undefined);

export const loginUrl = '/api/auth/begin';

export function OsuAuthProvider(props: PropsWithChildren<{}>) {
  const [user, userError, setUser] = useApi(authRemember);

  if (userError != null && userError.response?.status !== 401)
    window.alert(apiErrorMessage(userError)); // TODO: show error better

  async function logOut(): Promise<void> {
    await superagent.post('/api/auth/bye');

    setUser(undefined);
  };

  return (
    <authContext.Provider value={{
      logOut,
      user,
    }}>
      {props.children}
    </authContext.Provider>
  );
}

export function useOsuAuth() {
  const context = useContext(authContext);

  if (context == null)
    throw new Error('Must be called inside an OsuAuthProvider');

  return context;
}
