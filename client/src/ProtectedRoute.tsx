import { Route, RouteProps } from 'react-router-dom';
import { IRole } from './interfaces';
import { loginUrl, useOsuAuth } from './osuAuth';
import { canReadAs } from './permissions';

export function ProtectedRoute(props: RouteProps & { role?: IRole | 'any' }) {
  const user = useOsuAuth().user;

  return (
    <Route
      {...props}
      render={() => {
        if (user == null)
          return <p>I don't know who you are! Try <a href={loginUrl}>logging in</a> first.</p>;

        if (props.role == null || canReadAs(user, props.role))
          return props.children;

        return <p>You aren't cool enough to see this page.</p>
      }}
    />
  );
}
