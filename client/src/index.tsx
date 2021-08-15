import { StrictMode } from 'react';
import { render } from 'react-dom';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import { registerTextareaAutoHeightTrigger } from './auto-height';
import ForumOptIn from './forum-opt-in';
import { Header } from './Header';
import { IntlProviderWrapper } from './intl';
import { Manage } from './Manage';
import MapperConsents from './mapper-consents';
import { NoRoute } from './NoRoute';
import { NotReady } from './NotReady';
import { OsuAuthProvider } from './osuAuth';
import { Picks } from './Picks';
import { PicksRoundListing } from './PicksRoundListing';
import { ProtectedRoute } from './ProtectedRoute';
import Statistics from "./statistics";
import './style.css';
import SubmissionForm from './submission-form';
import SubmissionListingContainer from './submission-listing';
import Team from './team';

registerTextareaAutoHeightTrigger();

render(
  <StrictMode>
    <BrowserRouter>
      <OsuAuthProvider>
        <IntlProviderWrapper>
          <Header />
          <main className='big-center'>
            <Switch>
              <Redirect exact from='/' to='/submissions/osu' />
              <Route path='/submissions/:gameMode'><NotReady><SubmissionListingContainer /></NotReady></Route>
              <Route path='/submit'><SubmissionForm /></Route>
              <Route path='/mappers'><MapperConsents /></Route>
              <Route path='/team'><Team /></Route>
              <Redirect from='/captains' to='/team' />
              <Route path='/statistics'><Statistics /></Route>
              <ProtectedRoute exact path='/admin/picks' role='any'><PicksRoundListing /></ProtectedRoute>
              <ProtectedRoute path='/admin/picks/:round' role='any'><Picks /></ProtectedRoute>
              <ProtectedRoute path='/admin/manage' role='any'><Manage /></ProtectedRoute>
              <ProtectedRoute path='/admin/forum-opt-in' role='captain'><ForumOptIn /></ProtectedRoute>
              <Route path='*'><NoRoute /></Route>
            </Switch>
          </main>
        </IntlProviderWrapper>
      </OsuAuthProvider>
    </BrowserRouter>
  </StrictMode>,
  document.getElementById('loved-app'),
);
