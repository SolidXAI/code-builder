import { Tree } from '@angular-devkit/schematics';
import { FieldChange, FieldManager, ManagerForDtoOptions } from '../../FieldManager';
import { ShortTextFieldManagerForDto } from '../short-text/ShortTextFieldManagerForDto';

/**
 * Computed fields are persisted by the backend and must not be accepted from
 * either DTO. The short-text base is used only for its source-file and AST
 * removal support; computed fields never use its field-generation behavior.
 */
export class ComputedFieldManagerForDto
  extends ShortTextFieldManagerForDto
  implements FieldManager {
  constructor(
    tree: Tree,
    moduleName: string,
    modelName: string,
    field: any,
    options: ManagerForDtoOptions,
  ) {
    super(tree, moduleName, modelName, field, options);
  }

  override addField(): FieldChange[] {
    return [];
  }

  override updateField(): FieldChange[] {
    return this.removeField();
  }
}
