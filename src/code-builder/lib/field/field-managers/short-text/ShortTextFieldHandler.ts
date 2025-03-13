import { Tree } from '@angular-devkit/schematics';
import { DtoSourceType, FieldChange, FieldHandler, FieldManager, ManagerForDtoOptions } from '../../FieldManager';
import { ShortTextFieldManagerForDto } from './ShortTextFieldManagerForDto';
import { ShortTextFieldManagerForEntity } from './ShortTextFieldManagerForEntity';

export class ShortTextFieldHandler implements FieldHandler {
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
    this.entityFieldManager = new ShortTextFieldManagerForEntity(
      tree,
      moduleName,
      modelName,
      field,
      modelEnableSoftDelete
    );
    this.createDtoFieldManager = new ShortTextFieldManagerForDto(
      tree,
      moduleName,
      modelName,
      field,
      new ManagerForDtoOptions(DtoSourceType.Create)
    );
    this.updateDtoFieldManager = new ShortTextFieldManagerForDto(
      tree,
      moduleName,
      modelName,
      field,
      new ManagerForDtoOptions(DtoSourceType.Update)
    );

    
    //Instantiate the entity and dto source files
  }
  updateEntityField(): FieldChange[] {
    return this.entityFieldManager.updateField();
  }
  updateDtoField(): FieldChange[] {
    return [...this.createDtoFieldManager.updateField(), ...this.updateDtoFieldManager.updateField()];
  }
  removeEntityField(): FieldChange[] {
    return this.entityFieldManager.removeField();
  }
  removeDtoField(): FieldChange[] {
    return [...this.createDtoFieldManager.removeField(), ...this.updateDtoFieldManager.removeField()];
  }
  addEntityField(): FieldChange[] {
    return this.entityFieldManager.addField();
  }
  addDtoField(): FieldChange[] {
    return [...this.createDtoFieldManager.addField(), ...this.updateDtoFieldManager.addField()];
  }
}
