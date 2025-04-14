import { IsInt,IsOptional } from 'class-validator';
export class Update<%= classify(model) %>Dto<%= parentModel ? ` extends Update${classify(parentModel)}Dto` : `` %> {
    @IsOptional()
    @IsInt()
    id: number;
}