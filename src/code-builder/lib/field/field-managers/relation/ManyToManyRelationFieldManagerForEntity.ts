import { classify, dasherize } from '@angular-devkit/core/src/utils/strings';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { Change } from '@schematics/angular/utility/change';
import { FieldChange, FieldManager, FieldType, safeInsertImport } from '../../FieldManager';
import {
    BaseFieldManagerForEntity,
} from '../base/BaseFieldManagerForEntity';

export class ManyToManyRelationFieldManagerForEntity
    extends BaseFieldManagerForEntity
    implements FieldManager {

    fieldName(): string {
        return `${this.field.name}`;
    }

    fieldType(): FieldType {
        return this.manyToManyFieldType();
    }

    private manyToManyFieldType(): FieldType {
        const type = `${classify(this.field.relationCoModelSingularName)}`
        const text = `${type}[]`
        return {
            text: text,
            node: (_field: any) => ts.factory.createArrayTypeNode(
                ts.factory.createTypeReferenceNode(
                    ts.factory.createIdentifier(type),
                    undefined
                )
            ),
        };
    }

    override addField(): FieldChange[] {
        const fieldChanges = super.addField();
        if (fieldChanges.length > 0 && this.modelName !== this.field.relationCoModelSingularName) {
            const mainField = fieldChanges[0]; // The 1st field change is the main field change, related to the entity source file
            mainField.changes.push(this.relatedFieldImport());
        }
        return fieldChanges
    }

    override updateField(): FieldChange[] {
        const fieldChanges = super.updateField();
        if (fieldChanges.length > 0 && this.modelName !== this.field.relationCoModelSingularName) {
            const mainField = fieldChanges[0]; // The 1st field change is the main field change, related to the entity source file
            mainField.changes.push(this.relatedFieldImport());
        }
        return fieldChanges
    }

    relatedFieldImport(): Change {
        const relatedEntityImportName = `${dasherize(this.field.relationCoModelSingularName)}.entity`;
        const relatedEntityPath = this.field.relationModelModuleName ? `src/${dasherize(this.field.relationModelModuleName)}/entities/${relatedEntityImportName}` : `./${relatedEntityImportName}`;
        return safeInsertImport(this.source, classify(this.field.relationCoModelSingularName), relatedEntityPath, this.moduleName);
    }

}