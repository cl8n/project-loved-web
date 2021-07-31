import CountryFlag from './CountryFlag';
import { IUserWithoutRoles } from './interfaces';

type UserInlineProps = {
  showId?: boolean;
  user: IUserWithoutRoles;
};

export function UserInline(props: UserInlineProps) {
  return (
    <a className='no-wrap' href={`https://osu.ppy.sh/users/${props.user.id}`}>
      <CountryFlag country={props.user.country} />
      {` ${props.user.name}`}
      {props.showId &&
        ` [#${props.user.id}]`
      }
    </a>
  );
}
