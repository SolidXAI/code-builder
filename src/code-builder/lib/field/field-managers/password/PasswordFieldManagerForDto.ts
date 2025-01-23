import { Tree } from '@angular-devkit/schematics';
import ts, { PropertyDeclaration } from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { Change } from '@schematics/angular/utility/change';
import { FieldChange, FieldManager, FieldType, ManagerForDtoOptions } from '../../FieldManager';
import { BaseFieldManagerForDto } from '../base/BaseFieldManagerForDto';

export class PasswordFieldManagerForDto
  extends BaseFieldManagerForDto
  implements FieldManager {
  isJson(): boolean {
    return false;
  }
  isBoolean(): boolean {
    return false;
  }
  source: any;

  constructor(tree: Tree, moduleName: string, modelName: string, field: any, options: ManagerForDtoOptions) {
    super(tree, moduleName, modelName, { ...field, regexPattern: field.regexPattern ?? String.raw`^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).*$` }, options);
  }

  isString(): boolean {
    return true;
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
  protected override isApplyMinLength(): boolean {
    return true;
  }

  protected override isApplyMaxLength(): boolean {
    return true;
  }

  isApplyRegex(): boolean {
    return true; //TEMPORARY FIX
  }
  isApplyRequired(): boolean {
    return true;
  }
  isApplyMin(): boolean {
    return false //FIXME : override the min implementation for short text
  }
  isApplyMax(): boolean {
    return false //FIXME : override the max implementation for short text
  }
  isDate(): boolean {
    return false;
  }
  isTransform(): boolean {
    return false;
  }

  override addAdditionalField() : FieldChange[]{
    const fieldChanges: FieldChange[] = [];

    // Add the confirm field to the main entity
    fieldChanges.push(this.addAdditionalConfirmField());
  
    return fieldChanges;
  }

  addAdditionalConfirmField(): FieldChange {
        const fieldName = this.additionalFieldName();
        const fieldType = this.fieldType().text;
        const decoratorManagers = this.decoratorManagers;
        const source= this.source
        const field = this.field
        const modelName = this.modelName        

        return this.addFieldInternal(fieldName, fieldType, decoratorManagers, field, modelName, source);
  }

  override addOrUpdateAdditionalField(): FieldChange[] {
    const fieldChanges: FieldChange[] = [];

    // Add or update the ids field
    fieldChanges.push(this.updateAdditionalConfirmField());

    return fieldChanges;
  }

  updateAdditionalConfirmField(): FieldChange {
        const fieldName = this.additionalFieldName();
        const source = this.source

        // Handle the main source additional fields
        // Add or update the confirm field
        const confirmField = this.getFieldIdentifierNode(
            fieldName,
            source
        )?.parent as PropertyDeclaration;
        if (confirmField == null) {
            return this.addAdditionalConfirmField();
        }
        else {
            //Update the confirm field
            const fieldType = this.fieldType().node(this.field);
            const decoratorManagers = this.decoratorManagers;
            const field = this.field
            return this.updateFieldInternal(fieldName, fieldType, decoratorManagers, field, source);
        }
  }

  protected isAdditionalFieldRequired(): boolean {
    return true;
  }

  additionalFieldName(): string {
    return `${this.field.name}Confirm`;
  }

  fieldType(): FieldType {
    return {
      text: 'string',
      node: (_field: any) => ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    };
  }

  override  removeAdditionalField(): FieldChange[] {
    const changes: Change[] = [];
    if (this.isFieldPresent(this.additionalFieldName(), this.source)) {
      console.log(`\ncreate Dto removeField ${this.additionalFieldName()} called ...`);
      changes.push(...this.removeFieldFor(this.additionalFieldName(), this.source).changes);
    }
    return [{
      filePath: this.source.fileName,
      field: this.field,
      changes: changes,
    }];
  }


}
