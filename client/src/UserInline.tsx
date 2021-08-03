import CountryFlag from './CountryFlag';
import { IUserWithoutRoles } from './interfaces';

type UserInlineProps = {
  name?: string;
  showId?: boolean;
  user: IUserWithoutRoles;
};

export function UserInline({ name, showId, user }: UserInlineProps) {
  return (
    <a className='no-wrap' href={`https://osu.ppy.sh/users/${user.id}`}>
      <CountryFlag country={user.country} />
      {` ${name ?? user.name}`}
      {showId &&
        ` [#${user.id}]`
      }
    </a>
  );
}
