import { Tree } from '@angular-devkit/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { FieldManager, FieldType } from '../../FieldManager';
import { BaseFieldManagerForEntity } from '../base/BaseFieldManagerForEntity';
import { MAX_EMAIL_LENGTH } from '../../FieldManager';
import { isEmail } from 'class-validator';

export class EmailFieldManagerForEntity
  extends BaseFieldManagerForEntity
  implements FieldManager {
  source: ts.SourceFile;
  constructor(tree: Tree, moduleName: string, modelName: string, field: any, modelEnableSoftDelete: any) {
    super(tree, moduleName, modelName, field, modelEnableSoftDelete);

  }

  fieldType(): FieldType {
    return {
      text: 'string',
      node: (_field: any) => ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    };
  }

  override additionalColumnDecoratorOptions(): Map<string, any> {
    const additionalOptions: any = new Map<string, any>();
    additionalOptions.set('length', this.field.max ?? MAX_EMAIL_LENGTH);
    additionalOptions.set('default', this.defaultValueInitializer(this.field.defaultValue)?.value ?? null);    
    return additionalOptions;
  }

  override additionalColumnDecoratorOptionExpressions(): Map<string, ts.Expression | null> {
    const additionalOptions: any = new Map<string, ts.Expression | null>();
    (this.field.max) ? additionalOptions.set('length', ts.factory.createNumericLiteral(this.field.max)) : additionalOptions.set('length', ts.factory.createNumericLiteral(MAX_EMAIL_LENGTH));
    additionalOptions.set('default', this.defaultValueInitializer(this.field.defaultValue)?.expression ?? null);
    return additionalOptions;
  }

  protected override parseDefaultValue(defaultValue: string): string | null {
    if (!isEmail(defaultValue)) {
      // console.log(`Could not set  default value ${defaultValue}  for field ${this.field.name} in model ${this.modelName}`);
      return null;
    }
    return defaultValue;
  }
}