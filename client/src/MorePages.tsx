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
    </>
  );
}
