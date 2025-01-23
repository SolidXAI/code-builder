import { Tree } from '@angular-devkit/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { DefaultValueInitializer, FieldManager, FieldType, ManagerForDtoOptions } from '../../FieldManager';
import { BaseFieldManagerForDto } from '../base/BaseFieldManagerForDto';

export class DateFieldManagerForDto
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
  isApplyMin(): boolean { //FIXME : Implement the min decorator for date i.e @MinDate
    return true;
  }
  isApplyMax(): boolean { //FIXME: Implement the max decorator for date i.e @MaxDate
    return true;
  }
  isDate(): boolean {
    return true;
  }
  isTransform(): boolean {
    return true;
  }
  fieldType(): FieldType {
    return {
      text: 'Date',
      node: (_field: any) =>
        ts.factory.createTypeReferenceNode(
          ts.factory.createIdentifier("Date"),
          undefined
        )
    };
  }

  protected override parseDefaultValue(defaultValue: string): Date | null {
    if (!defaultValue) {
      return null;
    }
    try {
      // Parse string to a date object
      return new Date(defaultValue);
    }
    catch (e) {
      console.error(`Error parsing default value ${defaultValue}  for field ${this.field.name} in model ${this.modelName}`, e);
    }
    return null;
  }

  protected override defaultValueInitializer(defaultValueConfig: string): DefaultValueInitializer | null {
    const defaultValue = this.parseDefaultValue(defaultValueConfig);
    if (!defaultValue) {
      return null;
    }
    return {
      value: defaultValue,
      text: `new Date("${defaultValue.toISOString()}")`,
      expression: ts.factory.createNewExpression(
        ts.factory.createIdentifier("Date"),
        undefined,
        [ts.factory.createStringLiteral(defaultValue.toISOString())]
      )
    };
  }
}
