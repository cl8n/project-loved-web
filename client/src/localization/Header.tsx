export default function Header() {
  return (
    <>
      <h1>Localization</h1>
      <p>To translate this website:</p>
      <ul>
        <li>Select your locale below, or manually input the BCP 47 tag if it doesn't exist yet</li>
        <li>
          Translate the messages (you don't have to do all at once). Keep any colored text verbatim
          from the English messages. If you need to use special language for plural types, gendered
          words, etc., look up how to use ICU MessageFormat to do this.
        </li>
        <li>Click "Export messages"</li>
        <li>
          Either commit the resulting file to a fork of{' '}
          <a href='https://github.com/cl8n/project-loved-web'>project-loved-web</a> and open a pull
          request, or send it to someone else who can do that for you
        </li>
        <li>
          Keep in mind that (for now) this page doesn't save any of your work. Anything you type
          into the boxes will be cleared when you close the page or navigate away.
        </li>
      </ul>
    </>
  );
}
