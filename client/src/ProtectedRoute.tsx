import { Route, RouteProps } from 'react-router-dom';
import { IRole } from './interfaces';
import { loginUrl, useOsuAuth } from './osuAuth';
import { canReadAs } from './permissions';

export function ProtectedRoute(props: RouteProps & { role?: IRole | 'any' }) {
  const authUser = useOsuAuth().user;
  const children = props.children;
  delete props.children;

  return (
    <Route
      {...props}
      render={() => {
        if (authUser == null)
          return <p>I don't know who you are! Try <a href={loginUrl}>logging in</a> first.</p>;

        if (props.role == null || canReadAs(authUser, props.role))
          return children;

        return <p>You aren't cool enough to see this page.</p>
      }}
    />
  );
}
