import type { PropsWithChildren } from 'react';
import { createContext, useMemo } from 'react';
import superagent from 'superagent';
import { alertApiErrorMessage, authRemember, useApi } from './api';
import type { IUser } from './interfaces';
import { useRequiredContext } from './react-helpers';

interface OsuAuthContextValue {
  logOut: () => Promise<void>;
  user?: IUser;
}

const authContext = createContext<OsuAuthContextValue | undefined>(undefined);

export const loginUrl = '/api/auth/begin';

export function OsuAuthProvider({ children }: PropsWithChildren<{}>) {
  const [user, userError, setUser] = useApi(authRemember);
  const contextValue = useMemo(
    () => ({
      logOut: () => superagent.post('/api/auth/bye').then(() => setUser(undefined)),
      user,
    }),
    [setUser, user],
  );

  if (userError != null && userError.response?.status !== 401) {
    alertApiErrorMessage(userError);
  }

  return <authContext.Provider value={contextValue}>{children}</authContext.Provider>;
}

export function useOsuAuth() {
  return useRequiredContext(authContext);
}
