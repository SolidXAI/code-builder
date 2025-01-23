import { IsInt,IsOptional } from 'class-validator';
export class Update<%= classify(model) %>Dto {
    @IsOptional()
    @IsInt()
    id: number;
}