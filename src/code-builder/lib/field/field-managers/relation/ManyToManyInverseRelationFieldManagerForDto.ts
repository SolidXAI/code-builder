import { FieldManager } from '../../FieldManager';
import { ManyToManyRelationFieldManagerForDto } from './ManyToManyRelationFieldManagerForDto';

// For DTO's, the inverse relation behaivour is the same as the normal relation
export class ManyToManyInverseRelationFieldManagerForDto
    extends ManyToManyRelationFieldManagerForDto
    implements FieldManager {
}