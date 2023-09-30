import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import { gameModeLongName, gameModes } from 'loved-bridge/beatmaps/gameMode';
import { useState } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';
import { Never } from '../Never';
import useTitle from '../useTitle';
import type { ComparingStatistic, UserIdentity } from './helpers';
import { comparingStatistics, userIdentities } from './helpers';
import Questions from './Questions';

const messages = defineMessages({
  any: {
    defaultMessage: 'Any',
    description: '[General] Selector option indicating that any of the choices are valid',
  },
  comparer: {
    defaultMessage: 'Compare across:',
    description: '[Surveys] Selector for statistic to compare results across',
  },
  gameMode: {
    defaultMessage: 'Game mode:',
    description: '[General] Selector to change game mode',
  },
  joinYear: {
    defaultMessage: 'Account age',
    description: '[Surveys] Comparing statistic option',
  },
  mapper: {
    defaultMessage: 'Mapper',
    description: '[Surveys] Responder identity option',
  },
  none: {
    defaultMessage: 'None',
    description: '[General] Selector option indicating that none of the choices are valid',
  },
  player: {
    defaultMessage: 'Player',
    description: '[Surveys] Responder identity option',
  },
  rank: {
    defaultMessage: 'Rank',
    description: '[Surveys] Comparing statistic option',
  },
  userIdentity: {
    defaultMessage: 'Responder identity:',
    description: '[Surveys] Selector for responder identity',
  },
});

export default function SurveyResults() {
  useTitle('Survey results');
  const intl = useIntl();
  const { survey } = useParams<{ survey: string }>();
  const [comparingStatistic, setComparingStatistic] = useState<ComparingStatistic>();
  const [gameMode, setGameMode] = useState<GameMode>();
  const [userIdentity, setUserIdentity] = useState<UserIdentity>();

  if (survey == null) {
    return <Never />;
  }

  return (
    <>
      <div className='content-block'>
        <FormattedMessage
          defaultMessage='Survey results'
          description='[Surveys] Title of survey results page'
          tagName='h1'
        />
        <div className='flex-left'>
          <label htmlFor='gameMode'>{intl.formatMessage(messages.gameMode)}</label>
          <select
            name='gameMode'
            value={gameMode}
            onChange={(event) => {
              setGameMode(
                event.currentTarget.value ? parseInt(event.currentTarget.value, 10) : undefined,
              );
            }}
          >
            <option value=''>{intl.formatMessage(messages.any)}</option>
            {gameModes.map((m) => (
              <option key={m} value={m}>
                {gameModeLongName(m)}
              </option>
            ))}
          </select>
          <label htmlFor='userIdentity'>{intl.formatMessage(messages.userIdentity)}</label>
          <select
            name='userIdentity'
            value={userIdentity}
            onChange={(event) =>
              setUserIdentity((event.currentTarget.value as UserIdentity | '') || undefined)
            }
          >
            <option value=''>{intl.formatMessage(messages.any)}</option>
            {userIdentities.map((identity) => (
              <option key={identity} value={identity}>
                {intl.formatMessage(messages[identity])}
              </option>
            ))}
          </select>
          <label htmlFor='comparer'>{intl.formatMessage(messages.comparer)}</label>
          <select
            name='comparer'
            value={comparingStatistic}
            onChange={(event) =>
              setComparingStatistic(
                (event.currentTarget.value as ComparingStatistic | '') || undefined,
              )
            }
          >
            <option value=''>{intl.formatMessage(messages.none)}</option>
            {comparingStatistics.map((statistic) => (
              <option key={statistic} value={statistic}>
                {intl.formatMessage(messages[statistic])}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Questions
        comparingStatistic={comparingStatistic}
        gameMode={gameMode}
        survey={survey}
        userIdentity={userIdentity}
      />
    </>
  );
}
