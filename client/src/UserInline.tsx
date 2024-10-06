import type { PropsWithChildren } from 'react';
import CountryFlag from './CountryFlag';
import type { IUser } from './interfaces';

const anonymousUser = {
  id: 4294967296,
  avatar_url: '',
  banned: true,
  country: '__',
  name: 'Anonymous',
} as const;

interface UserInlineProps {
  hideBannedLabel?: boolean;
  name?: string;
  showId?: boolean;
  user: IUser | null;
}

export function UserInline({ hideBannedLabel, name, showId, user }: UserInlineProps) {
  let suffix = '';

  if (user == null) {
    // No special suffix for anonymous
    showId = false;
    user = anonymousUser;
  } else if (user.id >= 4294000000) {
    // "placeholder" suffix for users that couldn't be resolved to an ID
    showId = false;
    suffix = ' (placeholder)';
  } else if (user.banned) {
    // Forced ID and "restricted" suffix for restricted users
    showId = true;

    if (!hideBannedLabel) {
      suffix = ' (restricted)';
    }
  }

  return (
    <UserInlineContainer user={user}>
      <CountryFlag country={user.country} />
      {` ${name ?? user.name}`}
      {suffix}
      {showId && ` [#${user.id}]`}
    </UserInlineContainer>
  );
}

interface UserInlineContainerProps {
  user: IUser;
}

function UserInlineContainer({ children, user }: PropsWithChildren<UserInlineContainerProps>) {
  return user.banned ? (
    <span className='no-wrap'>{children}</span>
  ) : (
    <a className='no-wrap' href={`https://osu.ppy.sh/users/${user.id}`}>
      {children}
    </a>
  );
}
