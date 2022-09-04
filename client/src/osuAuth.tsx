import type { PropsWithChildren } from 'react';
import { createContext, useEffect, useMemo } from 'react';
import superagent from 'superagent';
import { alertApiErrorMessage, authRemember, useApi } from './api';
import type { IUserWithRoles } from './interfaces';
import { useRequiredContext } from './react-helpers';

interface OsuAuthContextValue {
  logOut: () => Promise<void>;
  user?: IUserWithRoles;
}

const authContext = createContext<OsuAuthContextValue | undefined>(undefined);

export const loginUrl = '/api/auth/begin';

export function OsuAuthProvider({ children }: PropsWithChildren<unknown>) {
  const [user, userError, setUser] = useApi(authRemember);
  const contextValue = useMemo(
    () => ({
      logOut: () => superagent.post('/api/auth/bye').then(() => setUser(undefined)),
      user,
    }),
    [setUser, user],
  );

  useEffect(() => {
    if (userError != null && userError.response?.status !== 401) {
      alertApiErrorMessage(userError);
    }
  }, [userError]);

  return <authContext.Provider value={contextValue}>{children}</authContext.Provider>;
}

export function useOsuAuth() {
  return useRequiredContext(authContext);
}
