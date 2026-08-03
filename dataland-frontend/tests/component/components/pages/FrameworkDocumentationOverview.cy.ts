import FrameworkDocumentationOverview from '@/components/pages/FrameworkDocumentationOverview.vue';
import router from '@/router';
import { type SimpleFrameworkSpecification } from '@clients/specificationservice';
import { minimalKeycloakMock } from '@ct/testUtils/Keycloak';

const mockFrameworks: SimpleFrameworkSpecification[] = [
  {
    framework: { id: 'sfdr', ref: 'https://local-dev.dataland.com/specifications/frameworks/sfdr' },
    name: 'SFDR',
  },
  {
    framework: {
      id: 'eutaxonomy-financials',
      ref: 'https://local-dev.dataland.com/specifications/frameworks/eutaxonomy-financials',
    },
    name: 'EU Taxonomy Financials',
  },
];

describe('Component tests for the FrameworkDocumentationOverview page', () => {
  it('Displays the list of frameworks', () => {
    cy.intercept('**/specifications/frameworks', mockFrameworks).as('listFrameworks');
    cy.mountWithPlugins(FrameworkDocumentationOverview, { keycloak: minimalKeycloakMock({}) });
    cy.wait('@listFrameworks');
    cy.get('[data-test="framework-documentation-table"]').should('contain', 'SFDR');
    cy.get('[data-test="framework-documentation-table"]').should('contain', 'EU Taxonomy Financials');
  });

  it('Navigates to the framework detail page when a row is clicked', () => {
    cy.intercept('**/specifications/frameworks', mockFrameworks).as('listFrameworks');
    cy.spy(router, 'push').as('routerPush');
    cy.mountWithPlugins(FrameworkDocumentationOverview, { keycloak: minimalKeycloakMock({}), router });
    cy.wait('@listFrameworks');
    cy.get('[data-test="framework-documentation-table"] tbody tr').contains('SFDR').click();
    cy.get('@routerPush').should('have.been.calledWith', '/frameworks/sfdr');
  });
});
