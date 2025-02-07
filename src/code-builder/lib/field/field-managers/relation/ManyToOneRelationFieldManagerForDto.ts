import { classify, dasherize } from '@angular-devkit/core/src/utils/strings';
import { Tree } from '@angular-devkit/schematics';
import ts, { PropertyDeclaration } from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { Change } from '@schematics/angular/utility/change';
import { ArrayDecoratorManager } from '../../decorator-managers/dto/ArrayDecoratorManager';
import { OptionalDecoratorManager } from '../../decorator-managers/dto/OptionalDecoratorManager';
import { StringDecoratorManager } from '../../decorator-managers/dto/StringDecoratorManager';
import { TransformDecoratorManager } from '../../decorator-managers/dto/TransformDecoratorManager';
import { DecoratorManager, DecoratorType, DtoSourceType, FieldChange, FieldManager, FieldType, ManagerForDtoOptions, createSourceFile, safeInsertImport } from '../../FieldManager';
import { BaseFieldManagerForDto } from '../base/BaseFieldManagerForDto';

export class ManyToOneRelationFieldManagerForDto
  extends BaseFieldManagerForDto
  implements FieldManager {
  isJson(): boolean {
    return false;
  }
  isBoolean(): boolean {
    return false;
  }
  relationInverseSource: ts.SourceFile;
  relationInverseDecoratorManagers: DecoratorManager[];

  constructor(tree: Tree, moduleName: string, modelName: string, field: any, options: ManagerForDtoOptions) {
    super(tree, moduleName, modelName, {...field, required: false}, options);
    if (this.field.relationCreateInverse) {
      const relatedEntityFileName = (this.options.sourceType === DtoSourceType.Create) ? `create-${dasherize(this.field.relationModelSingularName)}.dto.ts` : `update-${dasherize(this.field.relationModelSingularName)}.dto.ts`;
      const relatedEntityPath = this.field.relationModelModuleName ? `src/${dasherize(this.field.relationModelModuleName)}/dtos/${relatedEntityFileName}` : `src/${dasherize(moduleName)}/dtos/${relatedEntityFileName}`;
      this.relationInverseSource = createSourceFile(tree, relatedEntityPath);
      this.relationInverseDecoratorManagers = this.getFieldDecoratorManagers(
        this.field,
        this.relationInverseSource,
        DecoratorType.Array,
        DecoratorType.ValidateNested,
        // DecoratorType.Transform,
      );
      //HACK: This is a hack to add the transform decorator to the inverse field
      this.relationInverseDecoratorManagers.push(
        new TransformDecoratorManager({ isTransform: true, type: this.transformType(), source: this.relationInverseSource, field: field })
      );
      //HACK: This is a hack to replace the optional decorator to the inverse field
      this.relationInverseDecoratorManagers.push(
        new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: this.relationInverseSource, field: field })
      );
    }
  }

  isString(): boolean {
    return false;
  }
  isNumber(): boolean {
    return false;
  }
  isInt(): boolean {
    return true;
  }
  isDecimal(): boolean {
    return false;
  }
  isApplyRegex(): boolean {
    return false;
  }
  isApplyRequired(): boolean {
    return true;
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

  fieldType(): FieldType {
    return this.manyToOneFieldType();
  }

  private manyToOneFieldType(): FieldType {
    return {
      text: 'number',
      node: (_field: any) => ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
    };
  }

  // This field type is used in the case of one-to-many relation, when we generate the inverse field in the related entity
  additionalFieldType(): FieldType {
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
    return  `Update${classify(this.modelName)}Dto`;
  }

  override addAdditionalField(): FieldChange[] {
    const fieldChanges: FieldChange[] = [];

    // Add the userKey field to the main entity
    fieldChanges.push(this.addAdditionalUserKeyField());

    if (this.field.relationCreateInverse) {
      fieldChanges.push(this.addAdditionalInverseField());
      fieldChanges.push(this.addAdditionalInverseIdsField());
      fieldChanges.push(this.addAdditionalInverseCommandsField());
    }

    return fieldChanges;
  }

  private addAdditionalUserKeyField(): FieldChange {
    const fieldName = `${this.field.name}UserKey`;
    const fieldType = "string";
    const source = this.source;
    const field = this.field;
    const modelName = this.modelName;
    const decoratorManagers = [
      new StringDecoratorManager({ isString: true, source: source, field: field }),
      new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
    ];

    const fieldChange = this.addFieldInternal(fieldName, fieldType, decoratorManagers, field, modelName, source);

    return fieldChange;
  }
  
  private addAdditionalInverseCommandsField(): FieldChange {
    const fieldName = `${this.field.relationModelFieldName ?? this.modelName}Command`;
    const fieldType = "string";
    const source = this.relationInverseSource;
    const field = this.field;
    const modelName = this.field.relationModelSingularName;
    const decoratorManagers = [
      new StringDecoratorManager({ isString: true, source: source, field: field }),
      new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
      // TODO pending @IsEnum(RelationFieldsCommand) 
    ];

    //console.log(`\ncreate Dto addAdditionalInverseCommandsField ${fieldName} called ...`);

    const fieldChange = this.addFieldInternal(fieldName, fieldType, decoratorManagers, field, modelName, source);

    return fieldChange;
  }

  private addAdditionalInverseIdsField(): FieldChange {
    const fieldName = `${this.field.relationModelFieldName ?? this.modelName}Ids`;
    const fieldType = "number[]";
    const source = this.relationInverseSource;
    const field = this.field;
    const modelName = this.field.relationModelSingularName;
    const decoratorManagers = [
      new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
      new ArrayDecoratorManager({ isArray: true, source: source, field: field })
    ]

    //console.log(`\ncreate Dto addAdditionalInverseIdsField ${fieldName} called ...`);

    const fieldChange = this.addFieldInternal(fieldName, fieldType, decoratorManagers, field, modelName, source);

    return fieldChange;
  }

  private addAdditionalInverseField() {
    const fieldName = this.additionalFieldName();
    const fieldType = this.additionalFieldType().text;
    const source = this.relationInverseSource;
    const field = this.field;
    const modelName = this.field.relationModelSingularName;
    const decoratorManagers = this.relationInverseDecoratorManagers;
    //console.log(`\ncreate Dto addAdditionalInverseField ${fieldName} called ...`);
    const fieldChange = this.addFieldInternal(fieldName, fieldType, decoratorManagers, field, modelName, source);

    if (this.modelName !== this.field.relationModelSingularName) {
      const currentModelName = this.modelName;
      const currentModuleName = this.moduleName;
      fieldChange.changes.push(this.inverseFieldImport(currentModelName, currentModuleName, source));
    }
    return fieldChange;
  }

  override addOrUpdateAdditionalField(): FieldChange[] {
    const fieldChanges: FieldChange[] = [];

    // Add the userKey field to the main entity
    fieldChanges.push(this.updateAdditionalUserKeyField());
    if (this.field.relationCreateInverse) {
      fieldChanges.push(this.updateAdditionalInverseField());
      fieldChanges.push(this.updateAdditionalInverseIdsField());
      fieldChanges.push(this.updateAdditionalInverseCommandsField());
    }
    return fieldChanges;
  }

  private updateAdditionalUserKeyField(): FieldChange {
        const userKeyFieldName = `${this.field.name}UserKey`
        const userKeyFieldType = ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
        const source = this.source
        const field = this.field
        const decoratorManagers = [
            new StringDecoratorManager({ isString: true, source: source, field: field }),
            new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
            // TODO pending @IsEnum(RelationFieldsCommand) 
        ]
 
        const userKeyField = this.getFieldIdentifierNode(
            userKeyFieldName,
            source
        )?.parent as PropertyDeclaration;
        //console.log(`\ncreate Dto updateAdditionalInverseCommandsField ${userKeyFieldName} called ...`);

        if (userKeyField == null) {
            return this.addAdditionalUserKeyField();
        }
        else {
            //Update the command field
            return this.updateFieldInternal(userKeyFieldName, userKeyFieldType, decoratorManagers, field, source)
        }
  }

  private updateAdditionalInverseCommandsField(): FieldChange {

        const commandFieldName = `${this.field.relationModelFieldName ?? this.modelName}Command`
        const commandFieldType = ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
        const source = this.relationInverseSource
        const field = this.field
        const decoratorManagers = [
            new StringDecoratorManager({ isString: true, source: source, field: field }),
            new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
            // TODO pending @IsEnum(RelationFieldsCommand) 
        ]
 
        const commandField = this.getFieldIdentifierNode(
            commandFieldName,
            source
        )?.parent as PropertyDeclaration;
        //console.log(`\ncreate Dto updateAdditionalInverseCommandsField ${commandFieldName} called ...`);

        if (commandField == null) {
            return this.addAdditionalInverseCommandsField();
        }
        else {
            //Update the command field
            return this.updateFieldInternal(commandFieldName, commandFieldType, decoratorManagers, field, source)
        }
  }

  private updateAdditionalInverseIdsField(): FieldChange {
    const idsFieldName = `${this.field.relationModelFieldName ?? this.modelName}Ids`
    const idsFieldType = ts.factory.createArrayTypeNode(ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword));
    const source = this.relationInverseSource
    const field = this.field
    const decoratorManagers = [
        new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
        new ArrayDecoratorManager({ isArray: true, source: source, field: field })
    ]

    const idsField = this.getFieldIdentifierNode(
        idsFieldName,
        source
    )?.parent as PropertyDeclaration;
    //console.log(`\ncreate Dto updateAdditionalInverseIdsField ${idsFieldName} called ...`);

    if (idsField == null) {
        return this.addAdditionalInverseIdsField();
    }
    else {
        //Update the ids field
        return this.updateFieldInternal(idsFieldName, idsFieldType, decoratorManagers, field, source)
    }

  }

  private updateAdditionalInverseField() : FieldChange{
    const fieldName = this.additionalFieldName();
    const fieldType = this.additionalFieldType().node(this.field);
    const source = this.relationInverseSource;
    const field = this.field;
    const decoratorManagers = this.relationInverseDecoratorManagers;
   
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

  private inverseFieldImport(modelName: string, currentModuleName: string,  source: ts.SourceFile): Change {
    const inverseEntityImportName = `update-${dasherize(modelName)}.dto`;
    const modulePath = `src/${currentModuleName}`;
    
    const inverseEntityPath = `${modulePath}/dtos/${inverseEntityImportName}`;

    return safeInsertImport(source, `Update${classify(modelName)}Dto`, inverseEntityPath, currentModuleName);
  }

  override removeAdditionalField(): FieldChange[] {
    const fieldChanges: FieldChange[] = [];

    if (this.field.relationCreateInverse) {
      fieldChanges.push(this.removeAdditionalInverseField());
      fieldChanges.push(this.removeAdditionalInverseIdsField());
      fieldChanges.push(this.removeAdditionalInverseCommandsField());
    }
    return fieldChanges;
  }

  removeAdditionalInverseField(): FieldChange {
    const fieldName = this.additionalFieldName();
    const source = this.relationInverseSource;
    return this.removeFieldFor(fieldName, source);
  }

  removeAdditionalInverseIdsField(): FieldChange {
    const fieldName = `${this.field.relationModelFieldName ?? this.modelName}Ids`;
    const source = this.relationInverseSource;
    return this.removeFieldFor(fieldName, source);
  }

  removeAdditionalInverseCommandsField(): FieldChange {
    const fieldName = `${this.field.relationModelFieldName ?? this.modelName}Command`;
    const source = this.relationInverseSource;
    return this.removeFieldFor(fieldName, source);
  }

  override fieldName(): string {
    return `${this.field.name}Id`;
  }

  additionalFieldName(): string {
    return this.field.relationModelFieldName ?? `${this.modelName}s`;
  }

  protected isAdditionalFieldRequired(): boolean {
    return true;
  }

}
