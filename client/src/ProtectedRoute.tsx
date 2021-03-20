import { Route, RouteProps } from 'react-router-dom';
import { IRole } from './interfaces';
import { loginUrl, useOsuAuth } from './osuAuth';
import { canReadAs } from './permissions';

interface ProtectedRouteProps extends RouteProps {
  role?: IRole | 'any'
}

export function ProtectedRoute(props: ProtectedRouteProps) {
  const authUser = useOsuAuth().user;

  return (
    <Route
      {...props}
      children={undefined}
      component={undefined}
      render={() => {
        if (authUser == null)
          return <p>I don't know who you are! Try <a href={loginUrl}>logging in</a> first.</p>;

        if (props.role == null || canReadAs(authUser, props.role))
          return props.children;

        return <p>You aren't cool enough to see this page.</p>
      }}
    />
  );
}
