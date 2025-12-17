<%= outputEntitySuperClassImport(isLegacyTable, isLegacyTableWithId, parentModel, parentModule) %>
import { <%= parentModel ? `ChildEntity` : `Entity` %> } from 'typeorm'

<%= parentModel ? `@ChildEntity()` : `@Entity(${table ? `'${table}'` : ''})` %>
export class <%= classify(model) %> extends <%= parentModel ? `${classify(parentModel)}` : isLegacyTableWithId ? `LegacyCommonWithIdEntity`: isLegacyTable ? `LegacyCommonEntity` : `CommonEntity` %> {}