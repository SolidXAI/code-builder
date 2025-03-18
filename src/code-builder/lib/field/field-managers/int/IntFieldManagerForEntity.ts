import { Tree } from '@angular-devkit/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { DefaultValueInitializer, FieldManager, FieldType } from '../../FieldManager';
import { BaseFieldManagerForEntity } from '../base/BaseFieldManagerForEntity';
import { isInt } from 'class-validator';

export class IntFieldManagerForEntity
  extends BaseFieldManagerForEntity
  implements FieldManager
{
  source: ts.SourceFile;

  constructor(tree: Tree, moduleName: string, modelName: string, field: any, modelEnableSoftDelete: any) {
    super(tree, moduleName, modelName, field, modelEnableSoftDelete);
  }

  fieldType(): FieldType {
    return {
      text: 'number',
      node: (_field: any) =>
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
    };
  }

  // protected override additionalColumnDecoratorOptions(): Map<string, any> {
  //   const options = new Map<string, any>();
  //   options.set('default', this.defaultValueInitializer(this.field.defaultValue)?.value ?? null);
  //   return options; 
  // }

  // protected override additionalColumnDecoratorOptionExpressions(): Map<string, ts.Expression | null> {
  //   const options = new Map<string, ts.Expression | null>();
  //   options.set('default', this.defaultValueInitializer(this.field.defaultValue)?.expression ?? null);
  //   return options
  // }

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