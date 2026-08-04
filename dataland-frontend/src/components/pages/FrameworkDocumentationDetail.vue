<template>
  <TheContent class="relative" data-test="framework-documentation-detail">
    <div style="padding: var(--spacing-lg)">
      <div v-if="waitingForData" class="inline-loading text-center">
        <p class="font-medium text-xl">Loading framework...</p>
        <DatalandProgressSpinner />
      </div>
      <div v-else-if="!framework" data-test="framework-documentation-not-found">
        <h1>Framework not found</h1>
        <p>No framework documentation could be found for id "{{ frameworkId }}".</p>
      </div>
      <template v-else>
        <Button
          icon="pi pi-arrow-left"
          label="Back to overview"
          text
          data-test="framework-documentation-back-button"
          @click="goToOverview"
        />
        <h1 data-test="framework-documentation-title">{{ framework.name }}</h1>
        <p>{{ framework.businessDefinition }}</p>
        <Tabs :value="categories[0] ?? ''">
          <TabList>
            <Tab v-for="category in categories" :key="category" :value="category">
              {{ humanizeString(category) }}
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel v-for="category in categories" :key="category" :value="category">
              <DataTable
                :value="rowsByCategory[category]"
                data-key="key"
                rowGroupMode="subheader"
                groupRowsBy="subcategory"
                v-model:expandedRows="expandedRows"
                data-test="framework-documentation-datapoints-table"
                @row-expand="onRowExpand"
              >
                <template #groupheader="{ data }: { data: FrameworkDataPointRow }">
                  <span class="font-semibold">{{ humanizeString(data.subcategory) }}</span>
                </template>
                <Column expander style="width: 3rem" />
                <Column field="fieldName" header="FIELD">
                  <template #body="{ data }: { data: FrameworkDataPointRow }">
                    {{ humanizeString(data.fieldName) }}
                  </template>
                </Column>
                <Column field="dataPointName" header="DATA POINT"></Column>
                <Column field="dataPointBusinessDefinition" header="DEFINITION"></Column>
                <template #expansion="{ data }: { data: FrameworkDataPointRow }">
                  <div style="padding: var(--spacing-md)">
                    <p v-if="data.constraints.length" data-test="datapoint-constraints">
                      <strong>Constraints:</strong> {{ data.constraints.join(', ') }}
                    </p>
                    <div v-if="baseTypeDetails[data.dataPointBaseTypeId]" data-test="datapoint-base-type">
                      <p><strong>Base type:</strong> {{ baseTypeDetails[data.dataPointBaseTypeId]!.name }}</p>
                      <p>{{ baseTypeDetails[data.dataPointBaseTypeId]!.businessDefinition }}</p>
                      <p><strong>Validated by:</strong> {{ baseTypeDetails[data.dataPointBaseTypeId]!.validatedBy }}</p>
                      <Message severity="secondary" variant="simple" size="small" data-test="datapoint-example-notice">
                        Example value shape - illustrative only, not actual reported data.
                      </Message>
                      <pre>{{ JSON.stringify(baseTypeDetails[data.dataPointBaseTypeId]!.example, null, 2) }}</pre>
                    </div>
                    <div v-else class="inline-loading">
                      <DatalandProgressSpinner />
                    </div>
                  </div>
                </template>
              </DataTable>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </template>
    </div>
  </TheContent>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import type Keycloak from 'keycloak-js';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Button from 'primevue/button';
import Message from 'primevue/message';
import router from '@/router';
import TheContent from '@/components/generics/TheContent.vue';
import DatalandProgressSpinner from '@/components/general/DatalandProgressSpinner.vue';
import { ApiClientProvider } from '@/services/ApiClients';
import { assertDefined } from '@/utils/TypeScriptUtils';
import { humanizeStringOrNumber as humanizeString } from '@/utils/StringFormatter';
import {
  getFrameworkDetailWithDataPoints,
  getCachedDataPointBaseType,
  type FrameworkDataPointRow,
} from '@/utils/SpecificationDataUtils';
import { type FrameworkSpecification, type DataPointBaseTypeSpecification } from '@clients/specificationservice';

const { frameworkId } = defineProps<{ frameworkId: string }>();

const getKeycloakPromise = inject<() => Promise<Keycloak>>('getKeycloakPromise')!;
const apiClientProvider = new ApiClientProvider(assertDefined(getKeycloakPromise)());

const waitingForData = ref(true);
const framework = ref<FrameworkSpecification | null>(null);
const rows = ref<(FrameworkDataPointRow & { key: string })[]>([]);
const expandedRows = ref<Record<string, boolean>>({});
const baseTypeDetails = ref<Record<string, DataPointBaseTypeSpecification>>({});

const categories = computed<string[]>(() => [...new Set(rows.value.map((row) => row.category))]);

const rowsByCategory = computed<Record<string, (FrameworkDataPointRow & { key: string })[]>>(() => {
  const grouped: Record<string, (FrameworkDataPointRow & { key: string })[]> = {};
  for (const category of categories.value) {
    grouped[category] = rows.value
      .filter((row) => row.category === category)
      .sort((a, b) => a.subcategory.localeCompare(b.subcategory));
  }
  return grouped;
});

onMounted(async () => {
  try {
    const result = await getFrameworkDetailWithDataPoints(apiClientProvider, frameworkId);
    framework.value = result.framework;
    rows.value = result.rows.map((row) => ({ ...row, key: `${row.category}.${row.subcategory}.${row.fieldName}` }));
  } catch (error) {
    console.error(`Failed to fetch framework specification for ${frameworkId}`, error);
  } finally {
    waitingForData.value = false;
  }
});

/**
 * Navigates back to the framework documentation overview page.
 */
function goToOverview(): void {
  void router.push('/frameworks');
}

/**
 * Lazily fetches and caches the data point base type detail for a row once it is expanded.
 * @param event the PrimeVue row-expand event, containing the expanded row's data
 */
async function onRowExpand(event: { data: FrameworkDataPointRow }): Promise<void> {
  const dataPointBaseTypeId = event.data.dataPointBaseTypeId;
  if (!dataPointBaseTypeId || baseTypeDetails.value[dataPointBaseTypeId]) {
    return;
  }
  try {
    baseTypeDetails.value[dataPointBaseTypeId] = await getCachedDataPointBaseType(
      dataPointBaseTypeId,
      apiClientProvider
    );
  } catch (error) {
    console.error(`Failed to fetch data point base type ${dataPointBaseTypeId}`, error);
  }
}
</script>
