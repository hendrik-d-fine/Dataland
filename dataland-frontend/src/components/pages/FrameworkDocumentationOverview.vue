<template>
  <TheContent class="relative" data-test="framework-documentation-overview">
    <div style="padding: var(--spacing-lg)">
      <h1>Framework Documentation</h1>
      <p>Browse all reporting frameworks supported by Dataland and explore their data points.</p>
      <div v-if="waitingForData" class="inline-loading text-center">
        <p class="font-medium text-xl">Loading frameworks...</p>
        <DatalandProgressSpinner />
      </div>
      <DataTable
        v-else
        :value="frameworks"
        data-test="framework-documentation-table"
        class="table-cursor"
        :rowHover="true"
        @row-click="goToFramework($event.data)"
        sortField="name"
        :sortOrder="1"
      >
        <Column field="name" header="FRAMEWORK" :sortable="true"></Column>
        <Column field="framework.id" header="ID" :sortable="true"></Column>
      </DataTable>
    </div>
  </TheContent>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import type Keycloak from 'keycloak-js';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import TheContent from '@/components/generics/TheContent.vue';
import DatalandProgressSpinner from '@/components/general/DatalandProgressSpinner.vue';
import { ApiClientProvider } from '@/services/ApiClients';
import { assertDefined } from '@/utils/TypeScriptUtils';
import { type SimpleFrameworkSpecification } from '@clients/specificationservice';
import router from '@/router';

const getKeycloakPromise = inject<() => Promise<Keycloak>>('getKeycloakPromise')!;
const apiClientProvider = new ApiClientProvider(assertDefined(getKeycloakPromise)());

const frameworks = ref<SimpleFrameworkSpecification[]>([]);
const waitingForData = ref(true);

onMounted(async () => {
  try {
    frameworks.value = (await apiClientProvider.apiClients.specificationController.listFrameworkSpecifications()).data;
  } catch (error) {
    console.error('Failed to fetch framework specifications', error);
  } finally {
    waitingForData.value = false;
  }
});

/**
 * Navigates to the documentation detail page of the given framework.
 * @param framework the framework row that was clicked
 */
function goToFramework(framework: SimpleFrameworkSpecification): void {
  void router.push(`/frameworks/${framework.framework.id}`);
}
</script>
