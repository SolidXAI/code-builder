import { Tree } from '@angular-devkit/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { DefaultValueInitializer, FieldManager, FieldType } from '../../FieldManager';
import { BaseFieldManagerForEntity } from '../base/BaseFieldManagerForEntity';

export class BooleanFieldManagerForEntity
  extends BaseFieldManagerForEntity
  implements FieldManager
{
  source: ts.SourceFile;

  constructor(tree: Tree, moduleName: string, modelName: string, field: any) {
    super(tree, moduleName, modelName, field);
  }

  fieldType(): FieldType {
    return {
      text: 'boolean',
      node: (_field: any) =>
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
    };
  }

  protected override additionalColumnDecoratorOptionExpressions(): Map<string, ts.Expression | null> {
    const options = new Map<string, ts.Expression | null>();
    options.set('default', this.defaultValueInitializer(this.field.defaultValue)?.expression ?? null);
    return options
  }

  protected override additionalColumnDecoratorOptions(): Map<string, any> {
    const options = new Map<string, any>();
    options.set('default', this.defaultValueInitializer(this.field.defaultValue)?.value ?? null);
    return options; 
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
      value: defaultValue,
      text: defaultValue.toString(),
      expression: defaultValue ? ts.factory.createTrue() : ts.factory.createFalse()
    };
  }
}