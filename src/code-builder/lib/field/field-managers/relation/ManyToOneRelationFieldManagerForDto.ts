import { Tree } from '@angular-devkit/schematics';
import ts, { PropertyDeclaration } from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { OptionalDecoratorManager } from '../../decorator-managers/dto/OptionalDecoratorManager';
import { StringDecoratorManager } from '../../decorator-managers/dto/StringDecoratorManager';
import { FieldChange, FieldManager, FieldType, ManagerForDtoOptions } from '../../FieldManager';
import { BaseFieldManagerForDto } from '../base/BaseFieldManagerForDto';
import { ApiPropertyDecoratorManager } from '../../decorator-managers/dto/ApiPropertyDecoratorManager';

export class ManyToOneRelationFieldManagerForDto
  extends BaseFieldManagerForDto
  implements FieldManager {
  isJson(): boolean {
    return false;
  }
  isBoolean(): boolean {
    return false;
  }

  constructor(tree: Tree, moduleName: string, modelName: string, field: any, options: ManagerForDtoOptions) {
    super(tree, moduleName, modelName, {...field, required: false}, options);
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

  override addAdditionalField(): FieldChange[] {
    const fieldChanges: FieldChange[] = [];

    // Add the userKey field to the main entity
    fieldChanges.push(this.addAdditionalUserKeyField());

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
      new ApiPropertyDecoratorManager({isApplyApiProperty: true, source: source, field: field})
    ];

    const fieldChange = this.addFieldInternal(fieldName, fieldType, decoratorManagers, field, modelName, source);

    return fieldChange;
  }
  

  override addOrUpdateAdditionalField(): FieldChange[] {
    const fieldChanges: FieldChange[] = [];

    // Add the userKey field to the main entity
    fieldChanges.push(this.updateAdditionalUserKeyField());
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
            new ApiPropertyDecoratorManager({isApplyApiProperty: true, source: source, field: field})
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


  override removeAdditionalField(): FieldChange[] {
    const fieldChanges: FieldChange[] = [];
    
    fieldChanges.push(this.removeAdditionalUserKeyField());

    return fieldChanges;
  }

  private removeAdditionalUserKeyField(): FieldChange {
    const fieldName = `${this.field.name}UserKey`;
    const source = this.source;
    return this.removeFieldFor(fieldName, source);
  }


  override fieldName(): string {
    return `${this.field.name}Id`;
  }


  protected isAdditionalFieldRequired(): boolean {
    return true;
  }

}
