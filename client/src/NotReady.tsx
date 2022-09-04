import type { PropsWithChildren } from 'react';
import { FormattedMessage } from 'react-intl';
import { useOsuAuth } from './osuAuth';
import { hasRole } from './permissions';

export function NotReady({ children }: PropsWithChildren<unknown>) {
  const authUser = useOsuAuth().user;

  if (children == null || authUser == null || !hasRole(authUser, 'any')) {
    return (
      <>
        <FormattedMessage
          defaultMessage='Under construction'
          description='[Errors] Title of page not yet ready for public access'
          tagName='h1'
        />
        <FormattedMessage
          defaultMessage="This isn't available to you yet. Check back soon!"
          description='[Errors] Body of page not yet ready for public access'
          tagName='p'
        />
      </>
    );
  }

  return (
    <>
      <div className='warning-box'>
        This page is under construction and not accessible to the public. Things probably don't work
        as intended!
      </div>
      {children}
    </>
  );
}
