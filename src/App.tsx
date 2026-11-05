import { useEffect } from 'react';
import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { Layout } from './components/Layout';
import { GaragePage } from './pages/GaragePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ServiceFormPage } from './pages/ServiceFormPage';
import { ServiceTypeFormPage } from './pages/ServiceTypeFormPage';
import { SettingsPage } from './pages/SettingsPage';
import { VehicleFormPage } from './pages/VehicleFormPage';
import { VehiclePage } from './pages/VehiclePage';
import { syncAcrossTabs } from './store/garageStore';

export function App() {
  useEffect(() => syncAcrossTabs(), []);

  return (
    // Hash routes are the only kind that work when the file is opened directly.
    <Router hook={useHashLocation}>
      <Layout>
        <Switch>
          <Route path="/" component={GaragePage} />
          <Route path="/vehicles/new" component={VehicleFormPage} />
          <Route path="/vehicles/:id/edit" component={VehicleFormPage} />
          <Route path="/vehicles/:id/service/new/:typeId?" component={ServiceFormPage} />
          <Route path="/vehicles/:id/service/:recordId" component={ServiceFormPage} />
          <Route path="/vehicles/:id/service">
            <VehiclePage tab="service" />
          </Route>
          <Route path="/vehicles/:id">
            <VehiclePage />
          </Route>
          <Route path="/settings/services/new" component={ServiceTypeFormPage} />
          <Route path="/settings/services/:id" component={ServiceTypeFormPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFoundPage} />
        </Switch>
      </Layout>
    </Router>
  );
}
