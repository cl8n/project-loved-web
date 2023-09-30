import {
  GameMode,
  gameModeFromShortName,
  gameModeLongName,
  gameModes,
  gameModeShortName,
} from 'loved-bridge/beatmaps/gameMode';
import type { MouseEvent } from 'react';
import { Navigate, NavLink, useParams } from 'react-router-dom';
import useTitle from '../useTitle';
import NominationPlanner from './NominationPlanner';

export default function NominationPlannerPage() {
  const params = useParams<{ gameMode?: string }>();
  const gameMode = gameModeFromShortName(params.gameMode?.toLowerCase());
  useTitle(gameMode == null ? null : `${gameModeLongName(gameMode)} nomination planner`);

  if (gameMode == null) {
    return (
      <Navigate replace to={localStorage.getItem('gameMode') ?? gameModeShortName(GameMode.osu)} />
    );
  }

  const onGameModeClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const newGameMode = parseInt(event.currentTarget.dataset.gameMode ?? '', 10);

    if (newGameMode !== gameMode) {
      localStorage.setItem('gameMode', gameModeShortName(newGameMode));
    }
  };

  return (
    <>
      <h1>Nomination planner</h1>
      <nav className='nested'>
        {gameModes.map((gameMode) => (
          <NavLink
            key={gameMode}
            data-game-mode={gameMode}
            onClick={onGameModeClick}
            to={gameModeShortName(gameMode)}
          >
            {gameModeLongName(gameMode)}
          </NavLink>
        ))}
      </nav>
      <NominationPlanner gameMode={gameMode} />
    </>
  );
}
