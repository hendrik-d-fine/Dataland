import { type ApiClientProvider } from '@/services/ApiClients';
import {
  type DataPointBaseTypeSpecification,
  type DataPointTypeSpecification,
  type FrameworkSpecification,
} from '@clients/specificationservice';

/**
 * The shape of the `schema` field of a `FrameworkSpecification` once it has been JSON-parsed.
 * Maps category -> subcategory -> field name -> data point type id.
 */
export type FrameworkSchema = Record<string, Record<string, Record<string, string>>>;

/**
 * A single flattened row derived from a framework's schema, before data-point details are resolved.
 */
export interface FlattenedSchemaField {
  category: string;
  subcategory: string;
  fieldName: string;
  dataPointTypeId: string;
}

/**
 * A fully assembled row of a framework's documentation, combining the schema position with the
 * resolved data-point-type details.
 */
export interface FrameworkDataPointRow {
  category: string;
  subcategory: string;
  fieldName: string;
  dataPointTypeId: string;
  dataPointName: string;
  dataPointBusinessDefinition: string;
  dataPointBaseTypeId: string;
  constraints: string[];
}

/**
 * Parses the JSON-encoded `schema` field of a `FrameworkSpecification`.
 * @param schemaJson the raw JSON string as returned by the specification-service
 * @returns the parsed framework schema
 */
export function parseFrameworkSchema(schemaJson: string): FrameworkSchema {
  return JSON.parse(schemaJson) as FrameworkSchema;
}

/**
 * Flattens a nested framework schema (category -> subcategory -> field name -> data point type id)
 * into a flat list of rows.
 * @param schema the parsed framework schema
 * @returns the flattened list of schema fields
 */
export function flattenFrameworkSchema(schema: FrameworkSchema): FlattenedSchemaField[] {
  const flattenedFields: FlattenedSchemaField[] = [];
  for (const [category, subcategories] of Object.entries(schema)) {
    for (const [subcategory, fields] of Object.entries(subcategories)) {
      for (const [fieldName, dataPointTypeId] of Object.entries(fields)) {
        flattenedFields.push({ category, subcategory, fieldName, dataPointTypeId });
      }
    }
  }
  return flattenedFields;
}

const dataPointTypeCache = new Map<string, Promise<DataPointTypeSpecification>>();
const dataPointBaseTypeCache = new Map<string, Promise<DataPointBaseTypeSpecification>>();

/**
 * Fetches a data point type specification, memoizing the request so that repeated lookups of the
 * same id (across frameworks) only hit the backend once.
 * @param dataPointTypeId the id of the data point type to fetch
 * @param apiClientProvider the api client provider used to reach the specification-service
 * @returns the data point type specification
 */
export function getCachedDataPointType(
  dataPointTypeId: string,
  apiClientProvider: ApiClientProvider
): Promise<DataPointTypeSpecification> {
  let cachedPromise = dataPointTypeCache.get(dataPointTypeId);
  if (!cachedPromise) {
    cachedPromise = apiClientProvider.apiClients.specificationController
      .getDataPointTypeSpecification(dataPointTypeId)
      .then((response) => response.data);
    dataPointTypeCache.set(dataPointTypeId, cachedPromise);
  }
  return cachedPromise;
}

/**
 * Fetches a data point base type specification, memoizing the request so that repeated lookups of
 * the same id (across frameworks) only hit the backend once.
 * @param dataPointBaseTypeId the id of the data point base type to fetch
 * @param apiClientProvider the api client provider used to reach the specification-service
 * @returns the data point base type specification
 */
export function getCachedDataPointBaseType(
  dataPointBaseTypeId: string,
  apiClientProvider: ApiClientProvider
): Promise<DataPointBaseTypeSpecification> {
  let cachedPromise = dataPointBaseTypeCache.get(dataPointBaseTypeId);
  if (!cachedPromise) {
    cachedPromise = apiClientProvider.apiClients.specificationController
      .getDataPointBaseType(dataPointBaseTypeId)
      .then((response) => response.data);
    dataPointBaseTypeCache.set(dataPointBaseTypeId, cachedPromise);
  }
  return cachedPromise;
}

/**
 * Fetches a framework's specification and assembles a flat, display-ready list of its data points,
 * resolving each referenced data point type exactly once.
 * @param apiClientProvider the api client provider used to reach the specification-service
 * @param frameworkId the id of the framework to fetch
 * @returns the framework specification together with the assembled data point rows
 */
export async function getFrameworkDetailWithDataPoints(
  apiClientProvider: ApiClientProvider,
  frameworkId: string
): Promise<{ framework: FrameworkSpecification; rows: FrameworkDataPointRow[] }> {
  const framework = (
    await apiClientProvider.apiClients.specificationController.getFrameworkSpecification(frameworkId)
  ).data;
  const schema = parseFrameworkSchema(framework.schema);
  const flattenedFields = flattenFrameworkSchema(schema);

  const uniqueDataPointTypeIds = [...new Set(flattenedFields.map((field) => field.dataPointTypeId))];
  const dataPointTypesById = new Map<string, DataPointTypeSpecification>();
  await Promise.all(
    uniqueDataPointTypeIds.map(async (dataPointTypeId) => {
      dataPointTypesById.set(dataPointTypeId, await getCachedDataPointType(dataPointTypeId, apiClientProvider));
    })
  );

  const rows: FrameworkDataPointRow[] = flattenedFields.map((field) => {
    const dataPointType = dataPointTypesById.get(field.dataPointTypeId);
    return {
      category: field.category,
      subcategory: field.subcategory,
      fieldName: field.fieldName,
      dataPointTypeId: field.dataPointTypeId,
      dataPointName: dataPointType?.name ?? field.dataPointTypeId,
      dataPointBusinessDefinition: dataPointType?.businessDefinition ?? '',
      dataPointBaseTypeId: dataPointType?.dataPointBaseType.id ?? '',
      constraints: dataPointType?.constraints ?? [],
    };
  });

  return { framework, rows };
}
