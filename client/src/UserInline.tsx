import { IUser } from './interfaces';

type UserInlineProps = {
  user: IUser;
};

export function UserInline(props: UserInlineProps) {
  return (
    <span>
      <img
        src={`https://osu.ppy.sh/images/flags/${props.user.country}.png`}
        alt={`${props.user.country} flag`}
      />
      {props.user.name} [#{props.user.id}]
    </span>
  );
}
