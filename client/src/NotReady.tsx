import { PropsWithChildren } from "react";
import { useOsuAuth } from "./osuAuth";
import { canReadAs } from "./permissions";

export function NotReady({ children }: PropsWithChildren<{}>) {
  const authUser = useOsuAuth().user;

  if (children == null || (authUser == null || !canReadAs(authUser, 'god'))) {
    return (
      <>
        <div className='content-block'>
          <h1>Under construction</h1>
          <p>This isn't available to you yet. Maybe another page is?</p>
        </div>
        <div className='content-block'>
          <h2>Todo</h2>
          <ul>
            <li>Connect with desktop client <i>(almost done)</i></li>
            <li>Migrate submissions sheets</li>
            <li>Migrate mapper permissions sheet <i>(almost done)</i></li>
            <li>Submission API</li>
            <li>Submission views</li>
            <li className='done'>Management API</li>
            <li>Management views <i>(almost done)</i></li>
            <li>Tracking beatmap stats</li>
            <li className='done'>Server online & connected with osu!</li>
          </ul>
        </div>
      </>
    );
  }

  return <>{children}</>;
}
