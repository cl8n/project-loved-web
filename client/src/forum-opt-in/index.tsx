import useTitle from '../useTitle';

export default function ForumOptIn() {
  useTitle('Forum opt-in');

  return (
    <>
      <h1>Opt-in to forum posting</h1>
      <p>
        Authorizing with osu! here will let Project Loved news authors use your account to make
        forum posts. The permission will only be used to open polls for maps you wrote a description
        for.
      </p>
      <p>
        If you don't want to give this permission, your descriptions will be posted by a news author
        instead.
      </p>
      <p>
        <a href='/api/forum-opt-in'>Authorize forum posting on your account</a>
      </p>
    </>
  );
}
