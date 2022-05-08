import { apiErrorMessage, getHasExtraToken, useApi } from '../../api';

export default function AuthorizeLink() {
  const [hasExtraToken, hasExtraTokenError] = useApi(getHasExtraToken);

  if (hasExtraTokenError != null) {
    return (
      <span className='panic'>
        Failed to load extra token status: {apiErrorMessage(hasExtraTokenError)}
      </span>
    );
  }

  if (hasExtraToken == null) {
    return <span>Loading extra token status...</span>;
  }

  return hasExtraToken ? (
    <span className='success'>Your account is authorized!</span>
  ) : (
    <a href='/api/forum-opt-in'>Authorize forum posting on your account</a>
  );
}
