import { CommonEntity } from '@solidstarters/solid-core-module'
import {Entity} from "typeorm"
@Entity(<%= table ? `"${table}"` : '' %>)
export class <%= classify(model) %> extends CommonEntity{}