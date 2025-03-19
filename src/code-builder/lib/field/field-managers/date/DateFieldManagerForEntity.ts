import { Tree } from '@angular-devkit/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { DefaultValueInitializer, FieldManager, FieldType } from '../../FieldManager';
import { BaseFieldManagerForEntity } from '../base/BaseFieldManagerForEntity';

export class DateFieldManagerForEntity
  extends BaseFieldManagerForEntity
  implements FieldManager {
  source: ts.SourceFile;

  constructor(tree: Tree, moduleName: string, modelName: string, field: any, modelEnableSoftDelete: any) {
    super(tree, moduleName, modelName, field, modelEnableSoftDelete);
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

  protected override additionalColumnDecoratorOptions(): Map<string, any> {
    const options = new Map<string, any>();
    const defaultValue = this.parseDefaultValue(this.field.defaultValue);
    if (defaultValue) {
      options.set('default', defaultValue.toISOString()); // Haven't used the defaultValueInitializer method here, since the default value is slightly different i.e an ISO string instead of a date object
    }
    return options;
  }

  protected override additionalColumnDecoratorOptionExpressions(): Map<string, ts.Expression | null> {
    const options = new Map<string, ts.Expression | null>();
    options.set('default', this.defaultValueInitializer(this.field.defaultValue)?.expression ?? null);
    return options
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