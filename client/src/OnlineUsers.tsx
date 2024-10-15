import type { ReactNode } from 'react';
import { FormattedList, FormattedMessage } from 'react-intl';
import { apiErrorMessage, getOnlineUsers, useApi } from './api';
import { UserInline } from './UserInline';

export default function OnlineUsers() {
  const [onlineUsersResponse, onlineUsersError] = useApi(getOnlineUsers);

  if (onlineUsersError != null) {
    return (
      <span className='panic'>
        Failed to load online users: {apiErrorMessage(onlineUsersError)}
      </span>
    );
  }

  let usersNode: ReactNode;

  if (onlineUsersResponse == null) {
    usersNode = 'Loading...';
  } else {
    const { guestCount, users } = onlineUsersResponse;
    const listNodes = users.map((user) => <UserInline key={user.id} user={user} />);

    if (guestCount > 0) {
      listNodes.push(
        <FormattedMessage
          key='guests'
          defaultMessage='
            {count, plural,
              one {# guest}
              other {# guests}
            }
          '
          description='[Footer] Online user list guest count'
          values={{ count: guestCount }}
        />,
      );
    }

    usersNode =
      listNodes.length > 0 ? (
        <FormattedList value={listNodes} />
      ) : (
        <FormattedMessage
          defaultMessage='Nobody'
          description='[Footer] Online user list content when nobody is online'
        />
      );
  }

  return (
    <FormattedMessage
      defaultMessage='Online users: {users}'
      description='[Footer] Online users list'
      tagName='div'
      values={{ users: usersNode }}
    />
  );
}
