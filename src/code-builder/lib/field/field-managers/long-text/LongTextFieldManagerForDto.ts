import { Tree } from '@angular-devkit/schematics';
import { FieldManager, FieldType, ManagerForDtoOptions } from '../../FieldManager';
import { BaseFieldManagerForDto } from '../base/BaseFieldManagerForDto';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';

export class LongTextFieldManagerForDto
  extends BaseFieldManagerForDto
  implements FieldManager
{
  isJson(): boolean {
    return false;
  }
  isBoolean(): boolean {
    return false;
  }
  source: any;

  constructor(tree: Tree, moduleName: string, modelName: string, field: any, options: ManagerForDtoOptions) {
    super(tree, moduleName, modelName, field, options);
  }

  isString(): boolean {
    return true;
  }
  isNumber(): boolean {
    return false;
  }
  isInt(): boolean {
    return false;
  }
  isDecimal(): boolean {
    return false;
  }
  protected override isApplyMinLength(): boolean {
    return true;
  }
  protected override isApplyMaxLength(): boolean {
    return true;
  }

  isApplyRegex(): boolean {
    return true;
  }
  isApplyRequired(): boolean {
    return true;
  }
  isApplyMin(): boolean {
    return false //FIXME : override the min implementation for short text
  }
  isApplyMax(): boolean {
    return false //FIXME : override the max implementation for short text
  }
  isDate(): boolean {
    return false;
  }
  isTransform(): boolean {
    return false;
  }

  fieldType(): FieldType {
    return {
      text: 'string',
      node:  (_field: any) => ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    };
  }
}
