import { Tree } from '@angular-devkit/schematics';
import { DtoSourceType, FieldChange, FieldHandler, FieldManager, ManagerForDtoOptions } from '../../FieldManager';
import { RichTextFieldManagerForDto } from './RichTextFieldManagerForDto';
import { RichTextFieldManagerForEntity } from './RichTextFieldManagerForEntity';

export class RichTextFieldHandler implements FieldHandler {
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
    this.entityFieldManager = new RichTextFieldManagerForEntity(
      tree,
      moduleName,
      modelName,
      field,
      modelEnableSoftDelete
    );
    this.createDtoFieldManager = new RichTextFieldManagerForDto(
      tree,
      moduleName,
      modelName,
      field,
      new ManagerForDtoOptions(DtoSourceType.Create)
    );
    this.updateDtoFieldManager = new RichTextFieldManagerForDto(
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
