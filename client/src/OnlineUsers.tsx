import type { ReactNode } from 'react';
import { FormattedList, FormattedMessage } from 'react-intl';
import { apiErrorMessage, getOnlineUsers, useApi } from './api';
import { UserInline } from './UserInline';

export default function OnlineUsers() {
  const [onlineUsers, onlineUsersError] = useApi(getOnlineUsers);

  if (onlineUsersError != null) {
    return (
      <span className='panic'>
        Failed to load online users: {apiErrorMessage(onlineUsersError)}
      </span>
    );
  }

  let users: ReactNode;

  if (onlineUsers == null) {
    users = 'Loading...';
  } else if (onlineUsers.length === 0) {
    users = (
      <FormattedMessage
        defaultMessage='Nobody'
        description='[Footer] Online user list content when nobody is online'
      />
    );
  } else {
    users = (
      <FormattedList
        value={onlineUsers.map((user) => (
          <UserInline key={user.id} user={user} />
        ))}
      ></FormattedList>
    );
  }

  return (
    <FormattedMessage
      defaultMessage='Online users: {users}'
      description='[Footer] Online users list'
      tagName='div'
      values={{ users }}
    />
  );
}
