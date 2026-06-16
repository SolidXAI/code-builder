<%= outputEntitySuperClassImport(module, legacyTableType, parentModel, parentModule) %>
import { <%= parentModel ? `ChildEntity` : `Entity` %> } from 'typeorm'

<%= parentModel ? `@ChildEntity()` : `@Entity(${table ? `'${table}'` : ''})` %>
export class <%= classify(model) %> extends <%= parentModel ? `${classify(parentModel)}` : legacyTableType === 'generated_id' ? `LegacyCommonEntityWithGeneratedId` : legacyTableType === 'existing_id' ? `LegacyCommonEntityWithExistingId` : `CommonEntity` %> {}
