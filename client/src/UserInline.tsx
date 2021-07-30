import { IUserWithoutRoles } from './interfaces';

type UserInlineProps = {
  noFlag?: boolean;
  noId?: boolean;
  user: IUserWithoutRoles;
};

// https://github.com/ppy/osu-web/blob/7dfcbd2faa4909df6954f033734069fd33d48734/resources/assets/lib/flag-country.tsx#L12-L19
function flagUrl(countryCode: string) {
  const fileName = countryCode
    .split('')
    .map((c) => (c.charCodeAt(0) + 127397).toString(16))
    .join('-');

  return `https://osu.ppy.sh/assets/images/flags/${fileName}.svg`;
}

export function UserInline(props: UserInlineProps) {
  return (
    <a className='no-wrap' href={`https://osu.ppy.sh/users/${props.user.id}`}>
      {!props.noFlag &&
        <>
          <img
            alt={`${props.user.country} flag`}
            className='country-flag'
            src={flagUrl(props.user.country)}
          />
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
