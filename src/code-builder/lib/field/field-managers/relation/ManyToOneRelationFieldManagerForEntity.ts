import { classify, dasherize } from '@angular-devkit/core/src/utils/strings';
import { Tree } from '@angular-devkit/schematics';
import ts, { PropertyDeclaration } from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { Change } from '@schematics/angular/utility/change';
import { OneToManyDecoratorManager } from '../../decorator-managers/entity/OneToManyDecoratorManager';
import { DecoratorManager, FieldChange, FieldManager, FieldType, RelationType, createSourceFile, safeInsertImport } from '../../FieldManager';
import {
  BaseFieldManagerForEntity,
} from '../base/BaseFieldManagerForEntity';

export class ManyToOneRelationFieldManagerForEntity
  extends BaseFieldManagerForEntity
  implements FieldManager {
  source: ts.SourceFile;
  relationInverseSource: ts.SourceFile;

  oneToManyDecoratorManager: OneToManyDecoratorManager;
  inverseManyToManyDecoratorManager: DecoratorManager;


  constructor(tree: Tree, moduleName: string, modelName: string, field: any) {
    super(tree, moduleName, modelName, field);
    if (this.isAdditionalFieldRequired()) {
      const relatedEntityFileName = `${dasherize(this.field.relationModelSingularName)}.entity.ts`;
      const relatedEntityPath = this.field.relationModelModuleName ? `src/${dasherize(this.field.relationModelModuleName)}/entities/${relatedEntityFileName}` : `src/${dasherize(moduleName)}/entities/${relatedEntityFileName}`;
      this.relationInverseSource = createSourceFile( //TODO "src/iam/dtos/create-user.dto.ts" does not exist. If an entity is used in a many-to-one relation, the create-entity.dto.ts file should be exist.
        tree,
        relatedEntityPath,
      );

      this.oneToManyDecoratorManager = new OneToManyDecoratorManager(
        {
          isOneToMany: this.isOneToMany(),
          relationCascade: this.field.relationCascade,
          source: this.relationInverseSource,
          field: this.field,
          fieldName: this.fieldName(),
          modelName: this.modelName,
        },
      );
    }
  }

  fieldName(): string {
    switch(this.field.relationType) {
      case RelationType.ManyToOne:
        return super.fieldName();
      case RelationType.ManyToMany:
        return `${this.field.name}s`;
      default:
        throw new Error(`Unsupported relation type: ${this.field.relationType}`);
    }
  }

  fieldType(): FieldType {
    switch(this.field.relationType) {
      case RelationType.ManyToOne:
        return this.manyToOneFieldType();
      case RelationType.ManyToMany:
        return this.manyToManyFieldType();
      default:
        throw new Error(`Unsupported relation type: ${this.field.relationType}`);
    }
  }


  private manyToOneFieldType(): FieldType {
    return {
      text: classify(this.field.relationModelSingularName),
      node: (field: any) => ts.factory.createTypeReferenceNode(
        ts.factory.createIdentifier(
          classify(field.relationModelSingularName)
        ),
        undefined
      ),
    };
  }

  private manyToManyFieldType(): FieldType {
    const type = `${classify(this.field.relationModelSingularName)}`
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
    if (fieldChanges.length > 0 && this.modelName !== this.field.relationModelSingularName) { 
      const mainField = fieldChanges[0]; // The 1st field change is the main field change, related to the entity source file
      mainField.changes.push(this.relatedFieldImport());
    }
    return fieldChanges
  }

  override updateField(): FieldChange[] {
    const fieldChanges = super.updateField();
    if (fieldChanges.length > 0 && this.modelName !== this.field.relationModelSingularName) { 
      const mainField = fieldChanges[0]; // The 1st field change is the main field change, related to the entity source file
      mainField.changes.push(this.relatedFieldImport());
    }
    return fieldChanges
  }

  relatedFieldImport(): Change {
    const relatedEntityImportName = `${dasherize(this.field.relationModelSingularName)}.entity`;
    const relatedEntityPath = this.field.relationModelModuleName ? `src/${dasherize(this.field.relationModelModuleName)}/entities/${relatedEntityImportName}` : `./${relatedEntityImportName}`;
    return safeInsertImport(this.source, classify(this.field.relationModelSingularName), relatedEntityPath, this.moduleName);
  }

  private isOneToMany(): boolean {
    return (this.field.type === 'relation' && this.field.relationType === RelationType.ManyToOne && this.field.relationCreateInverse);
  }

  override removeAdditionalField(): FieldChange {
    const changes: Change[] = [];
    if (this.isFieldPresent(this.additionalFieldName(), this.relationInverseSource)) {
      console.log(`\nEntity removeField ${this.additionalFieldName()} called ...`);
      changes.push(...this.removeFieldFor(this.additionalFieldName(), this.relationInverseSource).changes);
    }
    return {
      filePath: this.relationInverseSource.fileName,
      field: this.field,
      changes: changes,
    };
  }

  override isAdditionalFieldRequired(): boolean {
    return (this.field.type === 'relation' && this.field.relationCreateInverse);
  }

  override addAdditionalField(): FieldChange[] {
    const fieldChanges: FieldChange[] = [];

    if (this.field.relationCreateInverse) {
      fieldChanges.push(this.addAdditionalInverseField());
    }

    return fieldChanges;
  }

  private addAdditionalInverseField(): FieldChange {
    const fieldName = this.additionalFieldName();
    const fieldType = this.additionalFieldType().text;
    const source= this.relationInverseSource
    const field = this.field
    const modelName = this.field.relationModelSingularName        
    const decoratorManagers = this.additionalDecoratorManagers();

    const fieldChange = this.addFieldInternal(fieldName, fieldType, decoratorManagers, field, modelName, source);
    if (this.modelName !== this.field.relationModelSingularName) {
      const currentModelName = this.modelName;
      const currentModuleName = this.moduleName; 
      fieldChange.changes.push(this.inverseFieldImport(currentModelName, currentModuleName, source));
    }
    return fieldChange;    
  }

  private inverseFieldImport(modelName: string, currentModuleName: string, source: ts.SourceFile): Change {
    const inverseEntityImportName = `${dasherize(modelName)}.entity`;
    const modulePath = `src/${currentModuleName}`;
    
    const inverseEntityPath = `${modulePath}/entities/${inverseEntityImportName}`;
    return safeInsertImport(source, classify(modelName), inverseEntityPath, currentModuleName);
  }

  override addOrUpdateAdditionalField(): FieldChange[] {
    const fieldChanges: FieldChange[] = [];

    if (this.field.relationCreateInverse) {
      fieldChanges.push(this.updateAdditionalInverseField());
    }
    return fieldChanges;
  }

  private updateAdditionalInverseField() : FieldChange{
    const fieldName = this.additionalFieldName();
    const fieldType = this.additionalFieldType().node(this.field);
    const source = this.relationInverseSource;
    const field = this.field;
    const decoratorManagers = this.additionalDecoratorManagers();
   
    const inverseField = this.getFieldIdentifierNode(fieldName, source)?.parent as PropertyDeclaration;
    if (inverseField == null) {
      return this.addAdditionalInverseField();
    }
    else {
      const fieldChange = this.updateFieldInternal(fieldName, fieldType, decoratorManagers, field, source); 
      if (this.modelName !== this.field.relationModelSingularName) {
        const currentModelName = this.modelName;
        const currentModuleName = this.moduleName; 
        fieldChange.changes.push(this.inverseFieldImport(currentModelName, currentModuleName, source));
      }
      return fieldChange;
    }
  }

  additionalFieldName(): string { // The inverse field type will remain the same for both one-to-many and many-to-many relations
    return this.field.relationModelFieldName ?? `${this.modelName}s`;
  }

  additionalFieldType(): FieldType { // The inverse field type will remain the same for both one-to-many and many-to-many relations
    const type = `${classify(this.modelName)}`
    const text = `${type}[]`
    return {
      text: text,
      node: (_field: any) =>
        ts.factory.createArrayTypeNode(ts.factory.createTypeReferenceNode(
          ts.factory.createIdentifier(type),
          undefined
        )),
    };
  }

  private additionalDecoratorManagers(): DecoratorManager[] {
    return [this.oneToManyDecoratorManager];
  }
  
}
