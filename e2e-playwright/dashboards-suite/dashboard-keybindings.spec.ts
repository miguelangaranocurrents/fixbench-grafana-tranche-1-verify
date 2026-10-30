import { test, expect } from '@grafana/plugin-e2e';

test.use({
  featureToggles: {
    dashboardNewLayouts: true,
  },
});

test.describe(
  'Dashboard keybindings',
  {
    tag: ['@dashboards'],
  },
  () => {
    // the "should collapse and expand all rows" test requires a larger viewport
    // otherwise the final panel is not visible when everything is expanded
    test.use({
      viewport: { width: 1280, height: 1080 },
    });

    test('should collapse and expand all rows', async ({ gotoDashboardPage, page, selectors }) => {
      const dashboardPage = await gotoDashboardPage({ uid: 'Repeating-rows-uid/repeating-rows' });

      const panelContents = dashboardPage.getByGrafanaSelector(selectors.components.Panels.Panel.content);
      await expect(panelContents).toHaveCount(5);
      await expect(
        dashboardPage.getByGrafanaSelector(selectors.components.Panels.Panel.title('server = A, pod = Bob'))
      ).toBeVisible();
      await expect(
        dashboardPage.getByGrafanaSelector(selectors.components.Panels.Panel.title('server = B, pod = Bob'))
      ).toBeVisible();

      // Collapse all rows using keyboard shortcut: d + Shift+C
      await page.keyboard.press('d');
      await page.keyboard.press('Shift+C');

      await expect(panelContents).toHaveCount(0);
      await expect(page.getByText('server = A, pod = Bob')).toBeHidden();
      await expect(page.getByText('server = B, pod = Bob')).toBeHidden();

      // Expand all rows using keyboard shortcut: d + Shift+E
      await page.keyboard.press('d');
      await page.keyboard.press('Shift+E');

      await expect(panelContents).toHaveCount(6);
      await expect(page.getByText('server = A, pod = Bob')).toBeVisible();
      await expect(page.getByText('server = B, pod = Bob')).toBeVisible();
    });

    test('should open panel inspect', async ({ gotoDashboardPage, page, selectors }) => {
      const dashboardPage = await gotoDashboardPage({ uid: 'edediimbjhdz4b/a-tall-dashboard' });

      // Find Panel #1 and press 'i' to open inspector
      const panel1 = dashboardPage.getByGrafanaSelector(selectors.components.Panels.Panel.title('Panel #1'));
      await expect(panel1).toBeVisible();
      await panel1.press('i');

      await expect(dashboardPage.getByGrafanaSelector(selectors.components.PanelInspector.Json.content)).toBeVisible();

      // Press Escape to close tooltip on the close button
      await page.keyboard.press('Escape');
      // Press Escape to close inspector
      await page.keyboard.press('Escape');

      await expect(page.getByTestId(selectors.components.PanelInspector.Json.content)).toBeHidden();
    });

    test.describe('when Grafana is served from a sub path', () => {
      // A second Grafana started with root_url http://localhost:3002/grafana/ and anonymous admin access
      const SUB_PATH_URL = process.env.GRAFANA_SUBPATH_URL ?? 'http://localhost:3002/grafana';

      test.use({ storageState: { cookies: [], origins: [] } });

      test('should open the focused panel in Explore', async ({ page, playwright, selectors }) => {
        const api = await playwright.request.newContext({
          baseURL: `${SUB_PATH_URL}/`,
          httpCredentials: { username: 'admin', password: 'admin', send: 'always' },
        });
        const response = await api.post('api/dashboards/db', {
          data: {
            dashboard: {
              uid: 'keybindings-sub-path',
              title: 'Keybindings under a sub path',
              schemaVersion: 42,
              panels: [
                {
                  id: 1,
                  type: 'timeseries',
                  title: 'Random walk',
                  gridPos: { x: 0, y: 0, w: 12, h: 8 },
                  datasource: { type: 'grafana-testdata-datasource', uid: 'PD8C576611E62080A' },
                  targets: [
                    {
                      refId: 'A',
                      datasource: { type: 'grafana-testdata-datasource', uid: 'PD8C576611E62080A' },
                      scenarioId: 'random_walk',
                    },
                  ],
                },
              ],
            },
            overwrite: true,
          },
        });
        expect(response.ok()).toBe(true);
        await api.dispose();

        await page.goto(`${SUB_PATH_URL}/d/keybindings-sub-path`);
        const panel = page.getByRole('region', { name: 'Random walk' });
        await expect(panel).toBeVisible();
        await panel.hover();
        await page.keyboard.press('p');
        await page.keyboard.press('x');

        await expect(page).toHaveURL(new RegExp(`^${SUB_PATH_URL}/explore`));
        await expect(page.getByTestId(selectors.pages.Explore.General.container)).toBeVisible();
      });
    });
  }
);
