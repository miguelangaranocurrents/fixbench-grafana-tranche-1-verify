import { test, expect } from '@grafana/plugin-e2e';

const SMOKE_DASHBOARD_UID = 'transforms-smoke';
const PANEL_MULTI_FIELD_TIME_SERIES = '1';
const PANEL_NO_TIME_FIELD = '2';

test.describe(
  'Panels test: Transformations',
  {
    tag: ['@panels'],
  },
  () => {
    test('Tests transformations editor', async ({ selectors, gotoDashboardPage }) => {
      const dashboardPage = await gotoDashboardPage({
        uid: 'TkZXxlNG3',
        queryParams: new URLSearchParams({ editPanel: '47' }),
      });

      await dashboardPage.getByGrafanaSelector(selectors.components.Tab.title('Transformations')).click();
      await dashboardPage.getByGrafanaSelector(selectors.components.Transforms.addTransformationButton).click();
      await dashboardPage.getByGrafanaSelector(selectors.components.TransformTab.newTransform('Reduce')).click();

      await expect(
        dashboardPage.getByGrafanaSelector(selectors.components.Transforms.Reduce.calculationsLabel)
      ).toBeVisible();
      await expect(dashboardPage.getByGrafanaSelector(selectors.components.Transforms.Reduce.modeLabel)).toBeVisible();
    });

    test('Tests case where transformations can be disabled and not clear out panel data', async ({
      selectors,
      gotoDashboardPage,
    }) => {
      const dashboardPage = await gotoDashboardPage({
        uid: 'TkZXxlNG3',
        queryParams: new URLSearchParams({ editPanel: '47' }),
      });

      await dashboardPage.getByGrafanaSelector(selectors.components.Tab.title('Transformations')).click();
      await dashboardPage.getByGrafanaSelector(selectors.components.Transforms.addTransformationButton).click();
      await dashboardPage.getByGrafanaSelector(selectors.components.TransformTab.newTransform('Reduce')).click();

      await dashboardPage.getByGrafanaSelector(selectors.components.Transforms.disableTransformationButton).click();
      await expect(
        dashboardPage.getByGrafanaSelector(selectors.components.Panels.Panel.PanelDataErrorMessage)
      ).toBeHidden();
    });

    test('Group by editor mounts in the legacy panel edit flow', async ({ selectors, gotoDashboardPage }) => {
      const dashboardPage = await gotoDashboardPage({
        uid: SMOKE_DASHBOARD_UID,
        queryParams: new URLSearchParams({ editPanel: PANEL_MULTI_FIELD_TIME_SERIES }),
      });

      await dashboardPage.getByGrafanaSelector(selectors.components.Tab.title('Transformations')).click();
      await dashboardPage.getByGrafanaSelector(selectors.components.Transforms.addTransformationButton).click();
      await dashboardPage.getByGrafanaSelector(selectors.components.TransformTab.newTransform('Group by')).click();

      const editor = dashboardPage.getByGrafanaSelector(
        selectors.components.TransformTab.transformationEditor('Group by')
      );
      await expect(editor).toBeVisible();
      await expect(editor.getByRole('alert', { name: 'An unexpected error happened' })).toBeHidden();
    });

    test('Merge series/tables stays applicable for a single-series input', async ({ selectors, gotoDashboardPage }) => {
      const dashboardPage = await gotoDashboardPage({
        uid: SMOKE_DASHBOARD_UID,
        queryParams: new URLSearchParams({ editPanel: PANEL_MULTI_FIELD_TIME_SERIES }),
      });

      await dashboardPage.getByGrafanaSelector(selectors.components.Tab.title('Transformations')).click();
      await dashboardPage.getByGrafanaSelector(selectors.components.Transforms.addTransformationButton).click();

      const card = dashboardPage.getByGrafanaSelector(
        selectors.components.TransformTab.newTransform('Merge series/tables')
      );
      await expect(card).toBeVisible();
      await expect(card.getByTestId(selectors.components.Transforms.applicabilityInfo)).toBeHidden();
    });

    test('Format time is flagged as not applicable in the legacy picker', async ({ selectors, gotoDashboardPage }) => {
      const dashboardPage = await gotoDashboardPage({
        uid: SMOKE_DASHBOARD_UID,
        queryParams: new URLSearchParams({ editPanel: PANEL_NO_TIME_FIELD }),
      });

      await dashboardPage.getByGrafanaSelector(selectors.components.Tab.title('Transformations')).click();
      await dashboardPage.getByGrafanaSelector(selectors.components.Transforms.addTransformationButton).click();

      const card = dashboardPage.getByGrafanaSelector(selectors.components.TransformTab.newTransform('Format time'));
      await expect(card).toBeVisible();

      const applicabilityInfo = card.getByTestId(selectors.components.Transforms.applicabilityInfo);
      await expect(applicabilityInfo).toBeVisible();
      await expect(applicabilityInfo).toHaveAttribute('aria-label', /requires a time field/);
    });

    test('Organize fields hides only the time field that is hidden', async ({
      request,
      selectors,
      gotoDashboardPage,
      page,
    }) => {
      const frames = [
        {
          fields: [
            { name: 'time', type: 'time', values: [1700000000000, 1700000060000] },
            { name: 'created', type: 'time', values: [1690000000000, 1690000060000] },
            { name: 'value', type: 'number', values: [1, 2] },
          ],
        },
      ];
      const response = await request.post('/api/dashboards/db', {
        data: {
          dashboard: {
            uid: 'transforms-organize-time-fields',
            title: 'Organize fields with two time fields',
            schemaVersion: 42,
            panels: [
              {
                id: 1,
                type: 'table',
                title: 'Events',
                gridPos: { x: 0, y: 0, w: 12, h: 10 },
                datasource: { type: 'grafana-testdata-datasource', uid: 'PD8C576611E62080A' },
                targets: [
                  {
                    refId: 'A',
                    datasource: { type: 'grafana-testdata-datasource', uid: 'PD8C576611E62080A' },
                    scenarioId: 'raw_frame',
                    rawFrameContent: JSON.stringify(frames),
                  },
                ],
                transformations: [
                  {
                    id: 'organize',
                    options: { excludeByName: { time: true }, indexByName: {}, renameByName: {} },
                  },
                ],
                fieldConfig: { defaults: {}, overrides: [] },
                options: {},
              },
            ],
          },
          overwrite: true,
        },
      });
      expect(response.ok()).toBe(true);

      const dashboardPage = await gotoDashboardPage({ uid: 'transforms-organize-time-fields' });

      await expect(dashboardPage.getByGrafanaSelector(selectors.components.Panels.Panel.title('Events'))).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'value', exact: true })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'created', exact: true })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'time', exact: true })).toBeHidden();
    });
  }
);
