<%= outputParentImportPathForEntity(parentModel, parentModule) %>
import {Entity} from 'typeorm'
@Entity(<%= table ? `"${table}"` : '' %>)
export class <%= classify(model) %> extends <%= parentModel ? `${classify(parentModel)}` : `CommonEntity` %>{}