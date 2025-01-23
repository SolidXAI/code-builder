import { Tree } from '@angular-devkit/schematics';
import { FieldChange, FieldManager, FieldType, ManagerForDtoOptions } from '../../FieldManager';
import { BaseFieldManagerForDto } from '../base/BaseFieldManagerForDto';

// This field return empty field changes, since there is no dto code changes required for media single field
export class MediaFieldManagerForDto
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
    return false;
  }
  isApplyMin(): boolean {
    return false;
  }
  isApplyMax(): boolean {
    return false;
  }
  isDate(): boolean {
    return false;
  }
  isTransform(): boolean {
    return false;
  }
  fieldType(): FieldType {
    throw new Error("No dto implementation required for media single field");
  }

  override addField(): FieldChange[] {
      return [{
        filePath: this.source.fileName,
        field: this.field,
        changes: [],
      }];
  }
  override removeField(): FieldChange[] {
      return [{
        filePath: this.source.fileName,
        field: this.field,
        changes: [],
      }];
  }
  override updateField(): FieldChange[] {
      return [{
        filePath: this.source.fileName,
        field: this.field,
        changes: [],
      }];
  }
}
