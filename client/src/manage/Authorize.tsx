import type { Role } from 'loved-bridge/tables';
import type { PropsWithChildren, ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { loginUrl, useOsuAuth } from '../osuAuth';
import { hasRole } from '../permissions';
import useTitle from '../useTitle';

interface AuthorizeProps {
  role: Role | readonly Role[] | 'any';
}

export default function Authorize({ children, role }: PropsWithChildren<AuthorizeProps>) {
  const authUser = useOsuAuth().user;
  useTitle(authUser == null ? 'Unauthenticated' : !hasRole(authUser, role) ? 'Unauthorized' : null);

  if (authUser == null) {
    return (
      <FormattedMessage
        defaultMessage="I don't know who you are! Try <a>logging in</a> first."
        description='[Errors] Error message shown when trying to view a protected page before logging in'
        tagName='p'
        values={{
          a: (c: ReactNode) => <a href={loginUrl}>{c}</a>,
        }}
      />
    );
  }

  if (!hasRole(authUser, role)) {
    return (
      <FormattedMessage
        defaultMessage="You aren't cool enough to see this page."
        description='[Errors] Error message shown when logged in but not having permission to view a page'
        tagName='p'
      />
    );
  }

  return children;
}
