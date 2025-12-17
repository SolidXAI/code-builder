import { Tree } from '@angular-devkit/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { FieldManager, FieldType } from '../../FieldManager';
import { BaseFieldManagerForEntity } from '../base/BaseFieldManagerForEntity';
import { SupportedDatabases, transformColumnOptionForDatabase } from '../../db-helpers';

//FIXME Implementation pending
export class LongTextFieldManagerForEntity
  extends BaseFieldManagerForEntity
  implements FieldManager {
  source: ts.SourceFile;

  constructor(tree: Tree, moduleName: string, modelName: string, field: any, modelEnableSoftDelete: any, dataSourceType?: SupportedDatabases) {
    super(tree, moduleName, modelName, field, modelEnableSoftDelete, dataSourceType);
  }

  fieldType(): FieldType {
    return {
      text: 'string',
      node: (_field: any) => ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    };
  }

  protected override additionalColumnDecoratorOptions(): Map<string, any> {
    const options = new Map<string, any>();
    //console.log(`Configuring LongText field with max length ${this.field.max} for database ${this.dataSourceType}`);
    if (this.field.max) {
      options.set('length', transformColumnOptionForDatabase(
        'length',
        this.field.max,
        this.field.ormType,
        this.dataSourceType,
      )
      );
    }

    options.set('default', this.defaultValueInitializer(this.field.defaultValue)?.value ?? null);
    return options;
  }

  protected override additionalColumnDecoratorOptionExpressions(): Map<string, ts.Expression | null> {
    const options = new Map<string, ts.Expression | null>();
    if (this.field.max) {
      const lengthValue = transformColumnOptionForDatabase(
        'length',
        this.field.max,
        this.field.ormType,
        this.dataSourceType,
      );

      if (typeof lengthValue === 'number') {
        options.set('length', ts.factory.createNumericLiteral(lengthValue));
      } else if (typeof lengthValue === 'string') {
        options.set('length', ts.factory.createStringLiteral(lengthValue));
      } else {
        options.set('length', null);
      }
    } else {
      options.set('length', null);
    }

    options.set('default', this.defaultValueInitializer(this.field.defaultValue)?.expression ?? null);
    return options
  }

}
