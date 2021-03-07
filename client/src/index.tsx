import { StrictMode } from 'react';
import { render } from 'react-dom';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { Header } from './Header';
import { Manage } from './Manage';
import { NoRoute } from './NoRoute';
import { NotReady } from './NotReady';
import { OsuAuthProvider } from './osuAuth';
import { PicksRoundListing } from './PicksRoundListing';
import { ProtectedRoute } from './ProtectedRoute';
import './style.css';

render(
  <StrictMode>
    <BrowserRouter>
      <OsuAuthProvider>
        <Header />
        <main className='big-center'>
          <Switch>
            <ProtectedRoute exact path='/admin/picks' role='any'><PicksRoundListing /></ProtectedRoute>
            <ProtectedRoute path='/admin/picks/:round' role='any'><NotReady /></ProtectedRoute>
            <ProtectedRoute path='/admin/manage' role='any'><Manage /></ProtectedRoute>
            <Route path='*'><NoRoute /></Route>
          </Switch>
        </main>
      </OsuAuthProvider>
    </BrowserRouter>
  </StrictMode>,
  document.getElementById('loved-app'),
);

/*
<Route exact path='/'><Submissions /></Route>
<Route path='/submit'><Submit /></Route>
            <Route path='/captains'><Captains /></Route>
            */
