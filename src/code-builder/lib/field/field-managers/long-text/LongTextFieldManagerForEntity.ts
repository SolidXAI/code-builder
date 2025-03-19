import { Tree } from '@angular-devkit/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { FieldManager, FieldType } from '../../FieldManager';
import { BaseFieldManagerForEntity } from '../base/BaseFieldManagerForEntity';

//FIXME Implementation pending
export class LongTextFieldManagerForEntity
  extends BaseFieldManagerForEntity
  implements FieldManager
{
  source: ts.SourceFile;

  constructor(tree: Tree, moduleName: string, modelName: string, field: any, modelEnableSoftDelete: any) {
    super(tree, moduleName, modelName, field, modelEnableSoftDelete);
  }

  fieldType(): FieldType {
    return {
      text: 'string',
      node:  (_field: any) => ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    };
  }

  protected override additionalColumnDecoratorOptions(): Map<string, any> {
    const options = new Map<string, any>();
    options.set('default', this.defaultValueInitializer(this.field.defaultValue)?.value ?? null);
    return options; 
  }

  protected override additionalColumnDecoratorOptionExpressions(): Map<string, ts.Expression | null> {
    const options = new Map<string, ts.Expression | null>();
    options.set('default', this.defaultValueInitializer(this.field.defaultValue)?.expression ?? null);
    return options
  }

}
