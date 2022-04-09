import { FormattedMessage } from 'react-intl';

export default function Header() {
  return (
    <>
      <FormattedMessage
        defaultMessage='Localization'
        description='[Localization] Localization page title'
        tagName='h1'
      />
      <p>To translate this website:</p>
      <ul>
        <li>Select your locale below, or manually input the BCP 47 tag if it doesn't exist yet.</li>
        <li>
          Translate the messages. Keep any colored text verbatim from the English messages. If you
          need to use variations of language for plural types, gendered words, etc., ask a developer
          if there are supported options for that message.
        </li>
        <li>Click "Export messages". A download containing your translations will start.</li>
        <li>
          If you're comfortable using git and GitHub, commit the file to a fork of{' '}
          <a href='https://github.com/cl8n/project-loved-web'>project-loved-web</a> at{' '}
          <code>client/src/translations/[locale].json</code>, and open a pull request. If not, send
          the file to a developer or one of the public channels.
        </li>
        <li>
          Keep in mind that <b>this page doesn't save any of your work</b>. Anything you type into
          the boxes will be cleared when you close the page, navigate away, or switch to a different
          locale.
        </li>
      </ul>
    </>
  );
}
