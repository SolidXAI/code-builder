import { Tree } from '@angular-devkit/schematics';
import {
  DtoSourceType,
  FieldChange,
  FieldHandler,
  FieldManager,
  ManagerForDtoOptions,
} from '../../FieldManager';
import { ComputedFieldManagerForEntity } from './ComputedFieldManagerForEntity';
import { ComputedFieldManagerForDto } from './ComputedFieldManagerForDto';
export class ComputedFieldHandler implements FieldHandler {
  entityFieldManager: FieldManager;
  createDtoFieldManager: FieldManager;
  updateDtoFieldManager: FieldManager;

  constructor(
    tree: Tree,
    moduleName: string,
    modelName: string,
    field: string,
    modelEnableSoftDelete: any
  ) {
    this.entityFieldManager = new ComputedFieldManagerForEntity(
      tree,
      moduleName,
      modelName,
      field,
      modelEnableSoftDelete,
    );
    this.createDtoFieldManager = new ComputedFieldManagerForDto(
      tree,
      moduleName,
      modelName,
      field,
      new ManagerForDtoOptions(DtoSourceType.Create),
    );
    this.updateDtoFieldManager = new ComputedFieldManagerForDto(
      tree,
      moduleName,
      modelName,
      field,
      new ManagerForDtoOptions(DtoSourceType.Update),
    );
  }
  updateEntityField(): FieldChange[] {
    return this.entityFieldManager.updateField();
  }
  updateDtoField(): FieldChange[] {
    return [
      ...this.createDtoFieldManager.updateField(),
      ...this.updateDtoFieldManager.updateField(),
    ];
  }
  removeEntityField(): FieldChange[] {
    return this.entityFieldManager.removeField();
  }
  removeDtoField(): FieldChange[] {
    return [
      ...this.createDtoFieldManager.removeField(),
      ...this.updateDtoFieldManager.removeField(),
    ];
  }
  addEntityField(): FieldChange[] {
    return this.entityFieldManager.addField();
  }
  addDtoField(): FieldChange[] {
    return [];
  }
}
