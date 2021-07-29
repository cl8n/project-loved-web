import { getTeam, useApi } from '../api';
import TeamList from './TeamList';

export default function Team() {
  const teamApi = useApi(getTeam);

  return (
    <>
      <div className='content-block'>
        <h1>Current team</h1>
        <TeamList current={true} teamApi={teamApi} />
      </div>
      <div className='content-block'>
        <h1>Alumni</h1>
        <TeamList current={false} teamApi={teamApi} />
      </div>
    </>
  );
}
