import { classify, dasherize } from '@angular-devkit/core/src/utils/strings';
import { Tree } from '@angular-devkit/schematics';
import ts, { PropertyDeclaration } from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { Change } from '@schematics/angular/utility/change';
import { ArrayDecoratorManager } from '../../decorator-managers/dto/ArrayDecoratorManager';
import { OptionalDecoratorManager } from '../../decorator-managers/dto/OptionalDecoratorManager';
import { StringDecoratorManager } from '../../decorator-managers/dto/StringDecoratorManager';
import { TransformDecoratorManager } from '../../decorator-managers/dto/TransformDecoratorManager';
import { DecoratorType, FieldChange, FieldManager, FieldType, ManagerForDtoOptions, safeInsertImport } from '../../FieldManager';
import { BaseFieldManagerForDto } from '../base/BaseFieldManagerForDto';
import { ApiPropertyDecoratorManager } from '../../decorator-managers/dto/ApiPropertyDecoratorManager';

export class OneToManyRelationFieldManagerForDto
  extends BaseFieldManagerForDto
  implements FieldManager {
  isJson(): boolean {
    return false;
  }
  isBoolean(): boolean {
    return false;
  }

  constructor(tree: Tree, moduleName: string, modelName: string, field: any, options: ManagerForDtoOptions) {
    super(tree, moduleName, modelName, { ...field, required: false }, options);
    this.decoratorManagers = [...this.decoratorManagers, ...this.getFieldDecoratorManagers(
      this.field,
      this.source,
      DecoratorType.Array,
      DecoratorType.ValidateNested,
    )];
    this.decoratorManagers.push(
      new TransformDecoratorManager({ isTransform: true, type: this.transformType(), source: this.source, field: field })
    );
  }

  isString(): boolean {
    return false;
  }
  isNumber(): boolean {
    return false;
  }
  isInt(): boolean {
    return false;
  }
  isDecimal(): boolean {
    return false;
  }
  isApplyRegex(): boolean {
    return false;
  }
  isApplyRequired(): boolean {
    return false;
  }
  isApplyMin(): boolean {
    return false;
  }
  isApplyMax(): boolean {
    return false;
  }
  isDate(): boolean {
    return false;
  }
  isTransform(): boolean {
    return false;
  }

  // This field type is used in the case of one-to-many relation, when we generate the inverse field in the related entity
  fieldType(): FieldType {
    const type = this.transformType() //TODO Discuss if this needs to be Create Or Update DTO
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

  private transformType(): string {
    return `Update${classify(this.field.relationCoModelSingularName)}Dto`;
  }

  override addField(): FieldChange[] {
    const fieldChanges: FieldChange[] = super.addField();
    if (fieldChanges.length > 0 && this.modelName !== this.field.relationCoModelSingularName) {
      const mainField = fieldChanges[0];
      mainField.changes.push(this.relatedFieldImport());
    }
    return fieldChanges;
  }

  override addAdditionalField(): FieldChange[] {
    const fieldChanges: FieldChange[] = [];

    // Add the ids field to the main entity
    fieldChanges.push(this.addAdditionalIdsField());
    // Add the command field to the main entity
    fieldChanges.push(this.addAdditionalCommandField());

    return fieldChanges;
  }

  private addAdditionalIdsField(): FieldChange {
    const fieldName = `${this.field.name}Ids`;
    const fieldType = "number[]";
    const source = this.source
    const field = this.field
    const modelName = this.modelName
    const decoratorManagers = [
      new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
      new ArrayDecoratorManager({ isArray: true, source: source, field: field }),
      new ApiPropertyDecoratorManager({isApplyApiProperty: true, source: source, field: field})
    ]

    return this.addFieldInternal(fieldName, fieldType, decoratorManagers, field, modelName, source);
  }

  private addAdditionalCommandField(): FieldChange {
    const fieldName = `${this.field.name}Command`;
    const fieldType = "string";
    const source = this.source
    const field = this.field
    const modelName = this.modelName
    const decoratorManagers = [
      new StringDecoratorManager({ isString: true, source: source, field: field }),
      new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
      new ApiPropertyDecoratorManager({isApplyApiProperty: true, source: source, field: field})
      // TODO pending @IsEnum(RelationFieldsCommand) 
    ]

    return this.addFieldInternal(fieldName, fieldType, decoratorManagers, field, modelName, source);

  }


  override updateField(): FieldChange[] {
    const fieldChanges: FieldChange[] = super.updateField();

    //FIXME This might not be required, since addField might never be called from within updateField
    // const containsAddFieldChanges = fieldChanges.filter((change) => !(change instanceof InsertChange));
    // if (containsAddFieldChanges) return fieldChanges;

    //This line is required to add import changes in the update context
    // if (fieldChanges.length > 0 && this.modelName !== this.field.relationCoModelSingularName) {
    const mainField = fieldChanges[0];
    mainField.changes.push(this.relatedFieldImport());
    // }
    return fieldChanges
  }

  override addOrUpdateAdditionalField(): FieldChange[] {
    const fieldChanges: FieldChange[] = [];

    // Add or update the ids field
    fieldChanges.push(this.updateAdditionalIdsField());
    // Add or update the command field
    fieldChanges.push(this.updateAdditionalCommandField());

    return fieldChanges;
  }

  private updateAdditionalIdsField(): FieldChange {
    const idsFieldName = `${this.field.name}Ids`
    const source = this.source
    const field = this.field

    // Handle the main source additional fields
    // Add or update the ids field
    const idsField = this.getFieldIdentifierNode(
      idsFieldName,
      source
    )?.parent as PropertyDeclaration;
    if (idsField == null) {
      return this.addAdditionalIdsField();
    }
    else {
      //Update the ids field
      const fieldType = ts.factory.createArrayTypeNode(ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword));
      const decoratorManagers = [
        new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
        new ArrayDecoratorManager({ isArray: true, source: source, field: field }),
        new ApiPropertyDecoratorManager({isApplyApiProperty: true, source: source, field: field})
      ];
      return this.updateFieldInternal(idsFieldName, fieldType, decoratorManagers, field, source);
    }

  }

  updateAdditionalCommandField(): FieldChange {
    const commandFieldName = `${this.field.name}Command`
    const source = this.source
    const field = this.field

    // Handle the main source additional fields
    // Add or update the command field
    const commandField = this.getFieldIdentifierNode(
      commandFieldName,
      source
    )?.parent as PropertyDeclaration;
    if (commandField == null) {
      return this.addAdditionalCommandField();
    }
    else {
      //Update the command field
      const fieldType = ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
      const decoratorManagers = [
        new StringDecoratorManager({ isString: true, source: source, field: field }),
        new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
        new ApiPropertyDecoratorManager({isApplyApiProperty: true, source: source, field: field})
        // TODO pending @IsEnum(RelationFieldsCommand) 
      ];
      return this.updateFieldInternal(commandFieldName, fieldType, decoratorManagers, field, source);
    }
  }


  override removeAdditionalField(): FieldChange[] {
    const fieldChanges: FieldChange[] = [];

    // Add the ids field to the main entity
    fieldChanges.push(this.removeAdditionalIdsField());
    // Add the command field to the main entity
    fieldChanges.push(this.removeAdditionalCommandField());

    return fieldChanges;
  }

  removeAdditionalIdsField(): FieldChange {
    const fieldName = `${this.field.name}Ids`;
    const source = this.source;
    return this.removeFieldFor(fieldName, source);
  }
  removeAdditionalCommandField(): FieldChange {
    const fieldName = `${this.field.name}Command`;
    const source = this.source;
    return this.removeFieldFor(fieldName, source);
  }

  protected isAdditionalFieldRequired(): boolean {
    return true;
  }

  relatedFieldImport(): Change {
    const relatedEntityImportName = `update-${dasherize(this.field.relationCoModelSingularName)}.dto`;
    const relatedEntityPath = this.field.relationModelModuleName ? `src/${this.field.relationModelModuleName}/dtos/${relatedEntityImportName}` : `./${relatedEntityImportName}`;
    return safeInsertImport(this.source, `Update${classify(this.field.relationCoModelSingularName)}Dto`, relatedEntityPath, this.moduleName);
    // return insertImport(this.source, this.source.fileName, `Update${classify(this.field.relationCoModelSingularName)}Dto`, relatedEntityPath);
  } //Uncomment this method while implementing many-to-many relation changes

}
