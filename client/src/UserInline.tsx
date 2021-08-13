import { PropsWithChildren } from 'react';
import CountryFlag from './CountryFlag';
import { IUserWithoutRoles } from './interfaces';

type UserInlineProps = {
  name?: string;
  showId?: boolean;
  user: IUserWithoutRoles;
};

export function UserInline({ name, showId, user }: UserInlineProps) {
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

function UserInlineContainer({ children, user }: Pick<PropsWithChildren<UserInlineProps>, 'children' | 'user'>) {
  return user.banned
    ? <span className='no-wrap'>{children}</span>
    : <a className='no-wrap' href={`https://osu.ppy.sh/users/${user.id}`}>{children}</a>;
}
