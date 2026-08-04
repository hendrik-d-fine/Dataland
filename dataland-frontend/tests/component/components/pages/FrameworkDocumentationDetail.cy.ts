import FrameworkDocumentationDetail from '@/components/pages/FrameworkDocumentationDetail.vue';
import router from '@/router';
import {
  type FrameworkSpecification,
  type DataPointTypeSpecification,
  type DataPointBaseTypeSpecification,
} from '@clients/specificationservice';
import { minimalKeycloakMock } from '@ct/testUtils/Keycloak';
import { getMountingFunction } from '@ct/testUtils/Mount';

const mockFramework: FrameworkSpecification = {
  framework: { id: 'sfdr', ref: 'https://local-dev.dataland.com/specifications/frameworks/sfdr' },
  name: 'SFDR',
  businessDefinition: 'Sustainability Finance Disclosure Regulation',
  schema: JSON.stringify({
    general: {
      general: {
        dataDate: {
          id: 'dpt1',
          ref: 'https://local-dev.dataland.com/specifications/data-point-types/dpt1',
          aliasExport: 'DATA_DATE',
        },
      },
    },
  }),
};

const mockDataPointType: DataPointTypeSpecification = {
  dataPointType: { id: 'dpt1', ref: 'https://local-dev.dataland.com/specifications/data-point-types/dpt1' },
  name: 'Data Date',
  businessDefinition: 'The date the data refers to.',
  dataPointBaseType: {
    id: 'dpbt1',
    ref: 'https://local-dev.dataland.com/specifications/data-point-base-types/dpbt1',
  },
  usedBy: [],
  constraints: ['mandatory'],
};

const mockDataPointBaseType: DataPointBaseTypeSpecification = {
  dataPointBaseType: {
    id: 'dpbt1',
    ref: 'https://local-dev.dataland.com/specifications/data-point-base-types/dpbt1',
  },
  name: 'Plain Date',
  businessDefinition: 'A plain calendar date.',
  validatedBy: 'PlainDateValidator',
  example: { value: '2024-01-01' },
  usedBy: [],
};

describe('Component tests for the FrameworkDocumentationDetail page', () => {
  it('Displays the framework header, category tabs and data points', () => {
    cy.intercept('**/specifications/frameworks/sfdr', mockFramework).as('getFramework');
    cy.intercept('**/specifications/data-point-types/dpt1', mockDataPointType).as('getDataPointType');
    getMountingFunction({ keycloak: minimalKeycloakMock({}) })(FrameworkDocumentationDetail, {
      props: { frameworkId: 'sfdr' },
    });
    cy.wait(['@getFramework', '@getDataPointType']);
    cy.get('[data-test="framework-documentation-title"]').should('contain', 'SFDR');
    cy.get('[role="tab"]').should('contain', 'General');
    cy.get('[data-test="framework-documentation-datapoints-table"]').should('contain', 'Data Date');
  });

  it('Lazily loads and displays the base type detail when a row is expanded', () => {
    cy.intercept('**/specifications/frameworks/sfdr', mockFramework).as('getFramework');
    cy.intercept('**/specifications/data-point-types/dpt1', mockDataPointType).as('getDataPointType');
    cy.intercept('**/specifications/data-point-base-types/dpbt1', mockDataPointBaseType).as('getDataPointBaseType');
    getMountingFunction({ keycloak: minimalKeycloakMock({}) })(FrameworkDocumentationDetail, {
      props: { frameworkId: 'sfdr' },
    });
    // Note: the data point type lookup is memoized across the spec file, so it may already be cached
    // from a previous test and not trigger a new request - only the framework fetch is guaranteed fresh.
    cy.wait('@getFramework');
    cy.get('[data-test="framework-documentation-datapoints-table"] [data-pc-group-section="rowactionbutton"]')
      .first()
      .click();
    cy.wait('@getDataPointBaseType');
    cy.get('[data-test="datapoint-base-type"]').should('contain', 'Plain Date');
    cy.get('[data-test="datapoint-constraints"]').should('contain', 'mandatory');
    cy.get('[data-test="datapoint-example-notice"]').should('contain', 'illustrative only');
  });

  it('Navigates back to the overview page when the back button is clicked', () => {
    cy.intercept('**/specifications/frameworks/sfdr', mockFramework).as('getFramework');
    cy.spy(router, 'push').as('routerPush');
    getMountingFunction({ keycloak: minimalKeycloakMock({}) })(FrameworkDocumentationDetail, {
      props: { frameworkId: 'sfdr' },
    });
    cy.wait('@getFramework');
    cy.get('[data-test="framework-documentation-back-button"]').click();
    cy.get('@routerPush').should('have.been.calledWith', '/frameworks');
  });

  it('Shows a not-found message when the framework cannot be loaded', () => {
    cy.intercept('**/specifications/frameworks/unknown-framework', { statusCode: 404, body: {} }).as(
      'getMissingFramework'
    );
    getMountingFunction({ keycloak: minimalKeycloakMock({}) })(FrameworkDocumentationDetail, {
      props: { frameworkId: 'unknown-framework' },
    });
    cy.wait('@getMissingFramework');
    cy.get('[data-test="framework-documentation-not-found"]').should('be.visible');
  });
});
