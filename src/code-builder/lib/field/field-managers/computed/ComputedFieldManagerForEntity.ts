import { Tree } from '@angular-devkit/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { FieldManager, FieldType } from '../../FieldManager';
import { BaseFieldManagerForEntity } from '../base/BaseFieldManagerForEntity';

export class ComputedFieldManagerForEntity
  extends BaseFieldManagerForEntity
  implements FieldManager {
  source: ts.SourceFile;

  constructor(tree: Tree, moduleName: string, modelName: string, field: any, modelEnableSoftDelete: any) {
    super(tree, moduleName, modelName, field, modelEnableSoftDelete);
  }

  fieldType(): FieldType {
    const computedFieldValueType = this.field.computedFieldValueType ?? 'string';
    switch (computedFieldValueType) {
      case 'int':
        return {
          text: 'number',
          node: (_field: any) => ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
        };
      case 'decimal':
        return {
          text: 'number',
          node: (_field: any) => ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
        };
      case 'boolean':
        return {
          text: 'boolean',
          node: (_field: any) => ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
        };
      case 'date':
      case 'datetime':
        return {
          text: 'Date',
          node: (_field: any) =>
            ts.factory.createTypeReferenceNode(
              ts.factory.createIdentifier("Date"),
              undefined
            )
        };
      default:
        return {
          text: 'string',
          node: (_field: any) => ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        };
    }
  }


  override additionalColumnDecoratorOptions(): Map<string, any> {
    const additionalOptions: any = new Map<string, any>();
    if (this.field.max) {
      additionalOptions.set('length', this.field.max);
    }

    return additionalOptions;
  }

  override additionalColumnDecoratorOptionExpressions(): Map<string, ts.Expression | null> {
    const additionalOptions: any = new Map<string, ts.Expression | null>();
    (this.field.max) ? additionalOptions.set('length', ts.factory.createNumericLiteral(this.field.max)) : additionalOptions.set('length', null);
    return additionalOptions;
  }
}
