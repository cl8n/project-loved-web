import { GameMode, gameModeLongName } from 'loved-bridge/beatmaps/gameMode';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import useTitle from './useTitle';

export default function MorePages() {
  useTitle('');

  return (
    <>
      <FormattedMessage
        defaultMessage='More pages'
        description='[More] Title for links to extra pages'
        tagName='h1'
      />
      <ul>
        <li>
          <Link to='/localization'>
            <FormattedMessage
              defaultMessage='Localization'
              description='[Localization] Localization page title'
            />
          </Link>
          <br />
          <FormattedMessage
            defaultMessage='Tools for translating and localizing this website'
            description='[Localization] Localization description'
          />
        </li>
        <li>
          <a href='/exports'>
            <FormattedMessage
              defaultMessage='Data exports'
              description='[Data exports] Data exports page title'
            />
          </a>
          <br />
          <FormattedMessage
            defaultMessage='Regular backups of (almost) all data on this website'
            description='[Data exports] Data exports description'
          />
        </li>
      </ul>
      <FormattedMessage
        defaultMessage='Discord servers'
        description='[Discord] Title for links to Discord servers'
        tagName='h2'
      />
      <ul>
        <li>
          <a href='https://discord.gg/ppy'>osu!dev</a>{' '}
          <FormattedMessage
            defaultMessage='(in {channel})'
            description='[Discord] Specifier for a channel of a Discord server'
            values={{ channel: <code>#osu-loved</code> }}
          />
          <br />
          <FormattedMessage
            defaultMessage='Main discussion channel for the maintenance and direction of Project Loved'
            description='[Discord] osu!dev Discord channel description'
          />
        </li>
        <li>
          <a href='https://discord.gg/gn58Uk5sTE'>osu! Project Loved</a>
          <br />
          <FormattedMessage
            defaultMessage='General server for {gameMode} Project Loved'
            description='[Discord] Game mode Discord server description'
            values={{ gameMode: gameModeLongName(GameMode.osu) }}
          />
        </li>
        <li>
          <a href='https://discord.com/invite/GhfjtZ6'>Project Loved: Taiko</a>
          <br />
          <FormattedMessage
            defaultMessage='General server for {gameMode} Project Loved'
            description='[Discord] Game mode Discord server description'
            values={{ gameMode: gameModeLongName(GameMode.taiko) }}
          />
        </li>
        <li>
          <a href='https://discord.gg/phgtyS4UCh'>osu!catch Project Loved</a>
          <br />
          <FormattedMessage
            defaultMessage='General server for {gameMode} Project Loved'
            description='[Discord] Game mode Discord server description'
            values={{ gameMode: gameModeLongName(GameMode.catch) }}
          />
        </li>
        <li>
          <a href='https://discord.gg/Ededv7m'>osu!mania Loved Community</a>
          <br />
          <FormattedMessage
            defaultMessage='General server for {gameMode} Project Loved'
            description='[Discord] Game mode Discord server description'
            values={{ gameMode: gameModeLongName(GameMode.mania) }}
          />
        </li>
      </ul>
      <FormattedMessage
        defaultMessage='osu! website'
        description='[More] Title for links to extra pages on the osu! website'
        tagName='h2'
      />
      <ul>
        <li>
          <a href='https://osu.ppy.sh/wiki/Community/Project_Loved'>
            <FormattedMessage defaultMessage='Wiki page' description='[More] Wiki page title' />
          </a>
          <br />
          <FormattedMessage
            defaultMessage='General information about Project Loved'
            description='[More] Wiki page description'
          />
        </li>
        <li>
          <a href='https://osu.ppy.sh/wiki/People/The_Team/Project_Loved_Team'>
            <FormattedMessage
              defaultMessage='Team wiki page'
              description='[More] Team wiki page title'
            />
          </a>
          <br />
          <FormattedMessage
            defaultMessage='General information about contributors to Project Loved'
            description='[More] Team wiki page description'
          />
        </li>
        <li>
          <a href='https://osu.ppy.sh/community/forums/120'>
            <FormattedMessage defaultMessage='Forum' description='[More] Forum title' />
          </a>
          <br />
          <FormattedMessage
            defaultMessage='Home of the poll topics that determine whether maps are Loved'
            description='[More] Forum description'
          />
        </li>
      </ul>
    </>
  );
}
