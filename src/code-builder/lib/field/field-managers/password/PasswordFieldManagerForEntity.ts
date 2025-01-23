import { Tree } from '@angular-devkit/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { FieldManager, FieldType } from '../../FieldManager';
import { BaseFieldManagerForEntity } from '../base/BaseFieldManagerForEntity';

export class PasswordFieldManagerForEntity
  extends BaseFieldManagerForEntity
  implements FieldManager {
  source: ts.SourceFile;
  constructor(tree: Tree, moduleName: string, modelName: string, field: any) {
    super(tree, moduleName, modelName, field);

  }

  fieldType(): FieldType {
    return {
      text: 'string',
      node: (_field: any) => ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    };
  }

  override additionalColumnDecoratorOptions(): Map<string, any> {
    const additionalOptions: any = new Map<string, any>();
    if (this.field.max) {
      additionalOptions.set('length', this.field.max);
    }
    additionalOptions.set('default', this.defaultValueInitializer(this.field.defaultValue)?.value ?? null);

    return additionalOptions;
  }

  override additionalColumnDecoratorOptionExpressions(): Map<string, ts.Expression | null> {
    const additionalOptions: any = new Map<string, ts.Expression | null>();
    (this.field.max) ? additionalOptions.set('length', ts.factory.createNumericLiteral(this.field.max)) : additionalOptions.set('length', null);
    additionalOptions.set('default', this.defaultValueInitializer(this.field.defaultValue)?.expression ?? null);

    return additionalOptions;
  }
}
