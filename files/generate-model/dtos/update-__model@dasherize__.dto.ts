import { IsInt,IsOptional } from 'class-validator';
<%= outputParentImportPathForDto(parentModel ,parentModule ,"update") %>
export class Update<%= classify(model) %>Dto<%= parentModel ? ` extends Update${classify(parentModel)}Dto` : `` %> {
    @IsOptional()
    @IsInt()
    id: number;
}