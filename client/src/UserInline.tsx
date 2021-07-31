import CountryFlag from './CountryFlag';
import { IUserWithoutRoles } from './interfaces';

type UserInlineProps = {
  noFlag?: boolean;
  noId?: boolean;
  user: IUserWithoutRoles;
};

export function UserInline(props: UserInlineProps) {
  return (
    <a className='no-wrap' href={`https://osu.ppy.sh/users/${props.user.id}`}>
      {!props.noFlag &&
        <>
          <CountryFlag country={props.user.country} />
          {' '}
        </>
      }
      {props.user.name}
      {!props.noId &&
        ` [#${props.user.id}]`
      }
    </a>
  );
}
