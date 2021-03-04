import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import superagent from 'superagent';
import { IUser } from './interfaces';

interface OsuAuth {
  logOut: () => Promise<void>;
  remember: () => Promise<void>;
  user?: IUser;
}

const authContext = createContext<OsuAuth | undefined>(undefined);

export const loginUrl = '/api/auth/begin';

export function OsuAuthProvider(props: PropsWithChildren<{}>) {
  const [user, setUser] = useState<IUser | undefined>(undefined);

  async function logOut(): Promise<void> {
    await superagent.post('/api/auth/bye');

    setUser(undefined);
  };

  function remember(): Promise<void> {
    return superagent
      .post('/api/auth/remember')
      .then((response) => setUser(response.body))
      .catch(() => {});
  };

  return (
    <authContext.Provider value={{
      logOut,
      remember,
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
