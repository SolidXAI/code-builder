import { Tree } from '@angular-devkit/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { DefaultValueInitializer, FieldManager, FieldType, ManagerForDtoOptions } from '../../FieldManager';
import { BaseFieldManagerForDto } from '../base/BaseFieldManagerForDto';
import { isInt } from 'class-validator';

export class IntFieldManagerForDto
  extends BaseFieldManagerForDto
  implements FieldManager
{
  isJson(): boolean {
    return false;
  }
  isBoolean(): boolean {
    return false;
  }
  source: any;

  constructor(tree: Tree, moduleName: string, modelName: string, field: any, options: ManagerForDtoOptions) {
    super(tree, moduleName, modelName, field, options);
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
    return true;
  }
  isApplyMax(): boolean {
    return true;
  }
  isDate(): boolean {
    return false;
  }
  isTransform(): boolean {
    return false;
  }
  fieldType(): FieldType {
    return {
      text: 'number',
      node: (_field: any) =>
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
    };
  }

  protected override parseDefaultValue(defaultValue: string): number | null {
    if (!isInt(defaultValue)) {
      // console.log(`Could not set default value ${defaultValue}  for field ${this.field.name} in model ${this.modelName}`);
      return null;
    }
    return Number(defaultValue);
  }

  protected override defaultValueInitializer(defaultValueConfig: string): DefaultValueInitializer | null {
      const defaultValue = this.parseDefaultValue(defaultValueConfig);
      if (defaultValue === null) {
          return null;
      }
      return {
          value: defaultValue,
          expression: ts.factory.createNumericLiteral(defaultValue.toString()),
          text: defaultValue.toString(),
      };
  }
}
