import { CommonEntity } from '<%= calculateModuleFileImportPath(module,"src/entities/common.entity") %>'
import {Entity} from 'typeorm'
@Entity(<%= table ? `"${table}"` : '' %>)
export class <%= classify(model) %> extends <%= parentModel ? `${classify(parentModel)}` : `CommonEntity` %>{}