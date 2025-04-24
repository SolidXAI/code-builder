<%= outputParentImportPathForEntity(parentModel, parentModule) %>
import { Entity } from 'typeorm'
<%= parentModel ? `@ChildEntity()` : `@Entity(${table ? `'${table}'` : ''})`
export class <%= classify(model) %> extends <%= parentModel ? `${classify(parentModel)}` : `CommonEntity` %> {}