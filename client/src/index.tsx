import { StrictMode } from 'react';
import { render } from 'react-dom';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { registerTextareaAutoHeightTrigger } from './auto-height';
import { Captains } from './Captains';
import { Header } from './Header';
import { Manage } from './Manage';
import { NoRoute } from './NoRoute';
import { NotReady } from './NotReady';
import { OsuAuthProvider } from './osuAuth';
import { Picks } from './Picks';
import { PicksRoundListing } from './PicksRoundListing';
import { ProtectedRoute } from './ProtectedRoute';
import './style.css';
import Statistics from "./statistics";
import SubmissionForm from './submission-form';

registerTextareaAutoHeightTrigger();

render(
  <StrictMode>
    <BrowserRouter>
      <OsuAuthProvider>
        <Header />
        <main className='big-center'>
          <Switch>
            <Route exact path='/'><NotReady /></Route>
            <Route path='/submit'><NotReady><SubmissionForm /></NotReady></Route>
            <Route path='/mappers'><NotReady /></Route>
            <Route path='/captains'><Captains /></Route>
            <Route path='/statistics'><Statistics /></Route>
            <ProtectedRoute exact path='/admin/picks' role='any'><PicksRoundListing /></ProtectedRoute>
            <ProtectedRoute path='/admin/picks/:round' role='any'><Picks /></ProtectedRoute>
            <ProtectedRoute path='/admin/manage' role='any'><Manage /></ProtectedRoute>
            <Route path='*'><NoRoute /></Route>
          </Switch>
        </main>
      </OsuAuthProvider>
    </BrowserRouter>
  </StrictMode>,
  document.getElementById('loved-app'),
);
