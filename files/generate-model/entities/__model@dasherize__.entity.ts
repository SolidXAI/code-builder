<%= outputEntitySuperClassImport(isLegacyTable, parentModel, parentModule) %>
import { <%= parentModel ? `ChildEntity` : `Entity` %> } from 'typeorm'

<%= parentModel ? `@ChildEntity()` : `@Entity(${table ? `'${table}'` : ''})` %>
export class <%= classify(model) %> extends <%= parentModel ? `${classify(parentModel)}` : isLegacyTable ? `LegacyCommonEntity` : `CommonEntity` %> {}