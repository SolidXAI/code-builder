import { Tree } from '@angular-devkit/schematics';
import { FieldManager, FieldType, ManagerForDtoOptions } from '../../FieldManager';
import { BaseFieldManagerForDto } from '../base/BaseFieldManagerForDto';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';

export class JsonFieldManagerForDto
  extends BaseFieldManagerForDto
  implements FieldManager {
  isJson(): boolean {
    return true;
  }
  isBoolean(): boolean {
    return false;
  }
  source: any;

  constructor(tree: Tree, moduleName: string, modelName: string, field: any, options: ManagerForDtoOptions) {
    super(tree, moduleName, modelName, field, options);
  }

  isString(): boolean {
    return false;
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
  isApplyRegex(): boolean {
    return false;
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
      text: 'any',
      node: (_field: any) => ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),//TODO : We could accept the type from input. Need to figure out how to create the property assignment from the same
    };
  }
}
