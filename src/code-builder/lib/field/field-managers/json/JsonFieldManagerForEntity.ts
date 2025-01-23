import { Tree } from '@angular-devkit/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { FieldManager, FieldType } from '../../FieldManager';
import { BaseFieldManagerForEntity } from '../base/BaseFieldManagerForEntity';

export class JsonFieldManagerForEntity
  extends BaseFieldManagerForEntity
  implements FieldManager {
  source: ts.SourceFile;

  constructor(tree: Tree, moduleName: string, modelName: string, field: any) {
    super(tree, moduleName, modelName, field);
  }

  fieldType(): FieldType {
    return {
      text: 'any',
      node: (_field: any) => ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
    };
  }

  /* // FIXME JSON default value implementation pending
  protected override additionalColumnDecoratorOptions(): Map<string, any> {
    const options = new Map<string, any>();
    const defaultValue = this.parseDefaultValue(this.field.defaultValue);
    if (defaultValue) {
        options.set('default', defaultValue);
    }
    return options;
  }

  protected override additionalColumnDecoratorOptionExpressions(): Map<string, ts.Expression | null> {
    const options = new Map<string, ts.Expression | null>();
    const defaultValue = this.parseDefaultValue(this.field.defaultValue);
    if (defaultValue) {
        options.set('default', ts.factory.createStringLiteral(defaultValue.toString()));
    }
    return options
  }

  protected override parseDefaultValue(defaultValue: string): any | null {
    try {
      return JSON.parse(defaultValue);
    }
    catch (e) {
      // console.log(`Could not set default value ${defaultValue}  for field ${this.field.name} in model ${this.modelName}`);
    }
    return null;
  }

  protected override defaultValueInitializer(defaultValueConfig: string): any | null {
    const defaultValue = this.parseDefaultValue(defaultValueConfig);
    if (!defaultValue) {
      return null;
    }
    return {
      expression: ts.factory.createStringLiteral(JSON.stringify(defaultValue)),
      value: defaultValue,
    }
  }*/

}
