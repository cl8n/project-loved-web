import { PropsWithChildren } from "react";
import { useOsuAuth } from "./osuAuth";
import { canReadAs } from "./permissions";

export function NotReady({ children }: PropsWithChildren<{}>) {
  const authUser = useOsuAuth().user;

  if (children == null || (authUser == null || !canReadAs(authUser, 'god'))) {
    return (
      <>
        <h1>Under construction</h1>
        <p>This isn't available to you yet. Maybe another page is?</p>
      </>
    );
  }

  return <>{children}</>;
}
