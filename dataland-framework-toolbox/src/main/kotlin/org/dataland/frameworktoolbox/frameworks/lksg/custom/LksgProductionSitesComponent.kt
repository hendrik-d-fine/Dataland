package org.dataland.frameworktoolbox.frameworks.lksg.custom

import org.dataland.frameworktoolbox.intermediate.FieldNodeParent
import org.dataland.frameworktoolbox.intermediate.components.requireDocumentSupportIn
import org.dataland.frameworktoolbox.intermediate.datapoints.NoDocumentSupport
import org.dataland.frameworktoolbox.specific.datamodel.TypeReference
import org.dataland.frameworktoolbox.specific.datamodel.elements.DataClassBuilder
import org.dataland.frameworktoolbox.specific.specification.elements.CategoryBuilder

/**
 * Represents the production site component for lksg
 */
class LksgProductionSitesComponent(
    identifier: String,
    parent: FieldNodeParent,
) : LksgSimpleCustomComponentBase(
        identifier = identifier,
        parent = parent,
        viewFormattingFunctionName = "formatLksgProductionSitesForDisplay",
        uploadComponentName = "ProductionSitesFormField",
        guaranteedFixtureExpression = "dataGenerator.randomArray(() => dataGenerator.generateLksgProductionSite(), 0, 5)",
        randomFixtureExpression = null,
    ) {
    override fun generateDefaultDataModel(dataClassBuilder: DataClassBuilder) {
        requireDocumentSupportIn(setOf(NoDocumentSupport))
        dataClassBuilder.addProperty(
            identifier,
            TypeReference(
                "List", isNullable,
                listOf(
                    TypeReference(
                        "org.dataland.datalandbackend.frameworks.lksg.custom.LksgProductionSite",
                        true,
                    ),
                ),
            ),
        )
    }

    override fun generateDefaultSpecification(specificationCategoryBuilder: CategoryBuilder) {
        requireDocumentSupportIn(setOf(NoDocumentSupport))
        specificationCategoryBuilder.addDefaultDatapointAndSpecification(
            this,
            "LksgProductionSitesComponent",
        )
    }
}
