import type { IUser } from '../interfaces';
import { UserInline } from '../UserInline';

interface UserListProps {
  title: string;
  users: IUser[];
}

export default function UserList({ title, users }: UserListProps) {
  return (
    <div>
      <h2>{title}</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            <UserInline user={user} />
          </li>
        ))}
      </ul>
    </div>
  );
}
