import { Tree } from '@angular-devkit/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { DefaultValueInitializer, FieldManager, FieldType, ManagerForDtoOptions } from '../../FieldManager';
import { BaseFieldManagerForDto } from '../base/BaseFieldManagerForDto';

export class BooleanFieldManagerForDto
  extends BaseFieldManagerForDto
  implements FieldManager {
  isJson(): boolean {
    return false;
  }
  isBoolean(): boolean {
    return true;
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
    return false;
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
    return {
      text: 'boolean',
      node: (_field: any) =>
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
    };
  }

  protected override parseDefaultValue(defaultValue: string): boolean | null {
    try {
      return Boolean(defaultValue);
    }
    catch (e) {
      // console.log(`Could not set default value ${defaultValue}  for field ${this.field.name} in model ${this.modelName}`);
    }
    return null;
  }

  protected override defaultValueInitializer(defaultValueConfig: string): DefaultValueInitializer | null {
    const defaultValue = this.parseDefaultValue(defaultValueConfig) ?? false;
    return {
      value : defaultValue,
      text: defaultValue.toString(),
      expression: defaultValue ? ts.factory.createTrue() : ts.factory.createFalse()
    };
  }
}
