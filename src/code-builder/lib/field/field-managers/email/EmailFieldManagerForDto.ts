import { Tree } from '@angular-devkit/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { FieldManager, FieldType, ManagerForDtoOptions, MAX_EMAIL_LENGTH } from '../../FieldManager';
import { BaseFieldManagerForDto } from '../base/BaseFieldManagerForDto';
import { EmailDecoratorManager } from '../../decorator-managers/dto/EmailDecoratorManager';
import { isEmail } from 'class-validator';

export class EmailFieldManagerForDto
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
    super(tree, moduleName, modelName, { ...field, max: field.max ?? MAX_EMAIL_LENGTH }, options);
    this.decoratorManagers.push(
      new EmailDecoratorManager({ isEmail: true, source : this.source, field: this.field})
    )
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
  override isApplyMaxLength(): boolean {
    return true;
  }
  isApplyRegex(): boolean {
    return true;
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
  fieldType(): FieldType {
    return {
      text: 'string',
      node: (_field: any) => ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    };
  }

  protected override parseDefaultValue(defaultValue: string): string | null {
    if (!isEmail(defaultValue)) {
      // console.log(`Could not set  default value ${defaultValue}  for field ${this.field.name} in model ${this.modelName}`);
      return null;
    }
    return defaultValue;
  }
}
