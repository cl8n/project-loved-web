import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import superagent from 'superagent';
import { IUser } from './interfaces';
import { apiErrorMessage } from './api';

interface OsuAuth {
  logOut: () => Promise<void>;
  user?: IUser;
}

const authContext = createContext<OsuAuth | undefined>(undefined);

export const loginUrl = '/api/auth/begin';

export function OsuAuthProvider(props: PropsWithChildren<{}>) {
  const [user, setUser] = useState<IUser | undefined>(undefined);

  useEffect(() => {
    superagent
      .get('/api/auth/remember')
      .then((response) => setUser(response.body))
      .catch((error) => window.alert(apiErrorMessage(error))); // TODO: show error better
  }, []);

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
