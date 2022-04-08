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
        description='Title for links to extra pages'
        tagName='h1'
      />
      <ul>
        <li>
          <Link to='/localization'>
            <FormattedMessage defaultMessage='Localization' description='Localization page title' />
          </Link>
          <br />
          <FormattedMessage
            defaultMessage='Tools for translating and localizing this website'
            description='Localization description'
          />
        </li>
        <li>
          <a href='/exports'>
            <FormattedMessage defaultMessage='Data exports' description='Data exports page title' />
          </a>
          <br />
          <FormattedMessage
            defaultMessage='Regular backups of (almost) all data on this website'
            description='Data exports description'
          />
        </li>
      </ul>
      <FormattedMessage
        defaultMessage='Discord servers'
        description='Title for links to Discord servers'
        tagName='h2'
      />
      <ul>
        <li>
          <a href='https://discord.gg/ppy'>osu!dev</a>{' '}
          <FormattedMessage
            defaultMessage='(in {channel})'
            description='Specifier for a channel of a Discord server'
            values={{ channel: <code>#osu-loved</code> }}
          />
          <br />
          <FormattedMessage
            defaultMessage='Main discussion channel for the maintenance and direction of Project Loved'
            description='osu!dev Discord channel description'
          />
        </li>
        <li>
          <a href='https://discord.com/invite/GhfjtZ6'>Project Loved: Taiko</a>
          <br />
          <FormattedMessage
            defaultMessage='General server for {gameMode} Project Loved'
            description='Game mode Discord server description'
            values={{ gameMode: gameModeLongName(GameMode.taiko) }}
          />
        </li>
        <li>
          <a href='https://discord.gg/Ededv7m'>osu!mania Loved Community</a>
          <br />
          <FormattedMessage
            defaultMessage='General server for {gameMode} Project Loved'
            description='Game mode Discord server description'
            values={{ gameMode: gameModeLongName(GameMode.mania) }}
          />
        </li>
        <li>
          <a href='https://discord.gg/0Vxo9AsejDkGlk3H'>osu!</a>{' '}
          <FormattedMessage
            defaultMessage='(in {channel})'
            description='Specifier for a channel of a Discord server'
            values={{ channel: <code>#project-loved</code> }}
          />
          <br />
          <FormattedMessage
            defaultMessage='Anything-goes channel about Project Loved; not very active and rarely checked'
            description='osu! community Discord channel description'
          />
        </li>
      </ul>
      <FormattedMessage
        defaultMessage='osu! website'
        description='Title for links to extra pages on the osu! website'
        tagName='h2'
      />
      <ul>
        <li>
          <a href='https://osu.ppy.sh/wiki/Community/Project_Loved'>
            <FormattedMessage defaultMessage='Wiki page' description='Wiki page title' />
          </a>
          <br />
          <FormattedMessage
            defaultMessage='General information about Project Loved'
            description='Wiki page description'
          />
        </li>
        <li>
          <a href='https://osu.ppy.sh/wiki/People/The_Team/Project_Loved_Team'>
            <FormattedMessage defaultMessage='Team wiki page' description='Team wiki page title' />
          </a>
          <br />
          <FormattedMessage
            defaultMessage='General information about contributors to Project Loved'
            description='Team wiki page description'
          />
        </li>
        <li>
          <a href='https://osu.ppy.sh/community/forums/120'>
            <FormattedMessage defaultMessage='Forum' description='Forum title' />
          </a>
          <br />
          <FormattedMessage
            defaultMessage='Home of the poll topics that determine whether maps are Loved'
            description='Forum description'
          />
        </li>
      </ul>
    </>
  );
}
