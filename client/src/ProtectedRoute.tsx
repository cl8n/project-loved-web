import type { Role } from 'loved-bridge/tables';
import { FormattedMessage } from 'react-intl';
import type { RouteProps } from 'react-router-dom';
import { Route } from 'react-router-dom';
import { loginUrl, useOsuAuth } from './osuAuth';
import { hasRole } from './permissions';
import useTitle from './useTitle';

interface ProtectedRouteProps extends RouteProps {
  role?: Role | 'any';
}

export function ProtectedRoute(props: ProtectedRouteProps) {
  const authUser = useOsuAuth().user;
  useTitle(
    authUser == null
      ? 'Unauthenticated'
      : props.role != null && !hasRole(authUser, props.role)
      ? 'Unauthorized'
      : null,
  );

  return (
    <Route
      {...props}
      children={undefined}
      component={undefined}
      render={() => {
        if (authUser == null) {
          return (
            <FormattedMessage
              defaultMessage="I don't know who you are! Try <a>logging in</a> first."
              description='[Errors] Error message shown when trying to view a protected page before logging in'
              tagName='p'
              values={{
                a: (c: string) => <a href={loginUrl}>{c}</a>,
              }}
            />
          );
        }

        if (props.role == null || hasRole(authUser, props.role)) {
          return props.children;
        }

        return (
          <FormattedMessage
            defaultMessage="You aren't cool enough to see this page."
            description='[Errors] Error message shown when logged in but not having permission to view a page'
            tagName='p'
          />
        );
      }}
    />
  );
}
