import { FieldChange, FieldHandler, FieldManager } from '../../FieldManager';

export class NoOpsFieldHandler implements FieldHandler {
  entityFieldManager: FieldManager;
  createDtoFieldManager: FieldManager;
  updateDtoFieldManager: FieldManager;
  constructor(_tree: any, _moduleName: string, _modelName: string, _field: any) {
  }
  updateEntityField(): FieldChange[] {
    return [];
  }
  updateDtoField(): FieldChange[] {
    return [];
  }
  removeEntityField(): FieldChange[] {
    return [];
  }
  removeDtoField(): FieldChange[] {
    return [];
  }

  addEntityField(): FieldChange[] {
    return [];
  }

  addDtoField(): FieldChange[] {
    return [];
  }
}
