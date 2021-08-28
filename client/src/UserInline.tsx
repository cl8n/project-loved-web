import { PropsWithChildren } from 'react';
import CountryFlag from './CountryFlag';
import { IUserWithoutRoles } from './interfaces';

const anonymousUser = {
  id: 4294967296,
  avatar_url: '',
  banned: true,
  country: '__',
  name: 'Anonymous',
} as const;

interface UserInlineProps {
  name?: string;
  showId?: boolean;
  user: IUserWithoutRoles | null;
}

export function UserInline({ name, showId, user }: UserInlineProps) {
  if (user == null) {
    user = anonymousUser;
  }

  if (user.banned && user.id < 4294000000) {
    showId = true;
  }

  return (
    <UserInlineContainer user={user}>
      <CountryFlag country={user.country} />
      {` ${name ?? user.name}`}
      {showId &&
        ` [#${user.id}]`
      }
    </UserInlineContainer>
  );
}

interface UserInlineContainerProps {
  user: IUserWithoutRoles;
}

function UserInlineContainer({ children, user }: PropsWithChildren<UserInlineContainerProps>) {
  return user.banned
    ? <span className='no-wrap'>{children}</span>
    : <a className='no-wrap' href={`https://osu.ppy.sh/users/${user.id}`}>{children}</a>;
}
