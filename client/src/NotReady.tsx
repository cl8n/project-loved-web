import { PropsWithChildren } from "react";
import { useOsuAuth } from "./osuAuth";
import { canReadAs } from "./permissions";

export function NotReady({ children }: PropsWithChildren<{}>) {
  const authUser = useOsuAuth().user;

  if (children == null || (authUser == null || !canReadAs(authUser, 'any'))) {
    return (
      <>
        <h1>Under construction</h1>
        <p>This isn't available to you yet. Check back soon!</p>
      </>
    );
  }

  return (
    <>
      <div className='warning-box'>
        This page is under construction and not accessible to the public.
        Things probably don't work as intended!
      </div>
      {children}
    </>
  );
}
