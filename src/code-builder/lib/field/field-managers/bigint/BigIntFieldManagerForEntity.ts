import { Tree } from '@angular-devkit/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { DefaultValueInitializer, FieldManager, FieldType } from '../../FieldManager';
import { BaseFieldManagerForEntity } from '../base/BaseFieldManagerForEntity';

export class BigIntFieldManagerForEntity
  extends BaseFieldManagerForEntity
  implements FieldManager
{
  source: ts.SourceFile;

  constructor(tree: Tree, moduleName: string, modelName: string, field: any, modelEnableSoftDelete: any) {
    super(tree, moduleName, modelName, field, modelEnableSoftDelete);
  }

  fieldType(): FieldType {
    return {
      text: 'bigint',
      node: (_field: any) =>
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.BigIntKeyword),
    };
  }

  protected override additionalColumnDecoratorOptions(): Map<string, any> {
     // Parse the default value from the field & set it to the column options
    const options = new Map<string, any>();
    options.set('default', this.defaultValueInitializer(this.field.defaultValue)?.value ?? null);
    return options; 
  }

  protected override additionalColumnDecoratorOptionExpressions(): Map<string, ts.Expression | null> {
    const options = new Map<string, ts.Expression | null>();
    options.set('default', this.defaultValueInitializer(this.field.defaultValue)?.expression as ts.Expression ?? null);
    return options
  }

  protected override parseDefaultValue(defaultValue: string): bigint | null {
    if (!defaultValue)  return null;
    try {
      return BigInt(defaultValue);
    }
    catch (e) {
      // console.log(`Could not set default value ${defaultValue}  for field ${this.field.name} in model ${this.modelName}`);
      return null;
    }
  }

  protected override defaultValueInitializer(defaultValueConfig: string): DefaultValueInitializer | null {
    const defaultValue = this.parseDefaultValue(defaultValueConfig);
    if (!defaultValue) return null;
    return {
      value: defaultValue,
      text: `${defaultValue.toString()}n`,
      expression: ts.factory.createBigIntLiteral(defaultValue.toString())
    }
  }

}