import { DtoSourceType, FieldChange, FieldHandler, FieldManager, ManagerForDtoOptions } from '../../FieldManager';
import { ManyToManyRelationFieldManagerForDto } from './ManyToManyRelationFieldManagerForDto';
import { ManyToManyRelationFieldManagerForEntity } from './ManyToManyRelationFieldManagerForEntity';

export class ManyToManyRelationFieldHandler implements FieldHandler {
  entityFieldManager: FieldManager;
  createDtoFieldManager: FieldManager;
  updateDtoFieldManager: FieldManager;
  constructor(tree: any, moduleName: string, modelName: string, field: any, modelEnableSoftDelete: any) {
    this.entityFieldManager = new ManyToManyRelationFieldManagerForEntity(
      tree,
      moduleName,
      modelName,
      field,
      modelEnableSoftDelete
    );
    this.createDtoFieldManager = new ManyToManyRelationFieldManagerForDto(
      tree,
      moduleName,
      modelName,
      field,
      new ManagerForDtoOptions(DtoSourceType.Create)
    );
    this.updateDtoFieldManager = new ManyToManyRelationFieldManagerForDto(
      tree,
      moduleName,
      modelName,
      field,
      new ManagerForDtoOptions(DtoSourceType.Update)
    );
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
