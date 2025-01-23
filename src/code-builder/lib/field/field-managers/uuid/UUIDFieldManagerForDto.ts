import { Tree } from '@angular-devkit/schematics';
import { FieldManager, ManagerForDtoOptions, UUID_REGEX } from '../../FieldManager';
import { ShortTextFieldManagerForDto } from '../short-text/ShortTextFieldManagerForDto';

export class UUIDFieldManagerForDto
  extends ShortTextFieldManagerForDto
  implements FieldManager {
  source: any;

  constructor(tree: Tree, moduleName: string, modelName: string, field: any, options: ManagerForDtoOptions) {
    super(tree, moduleName, modelName, { ...field, regexPattern: UUID_REGEX }, options);
  }

  isApplyRegex(): boolean {
    return true;
  }
}
