import { IsString, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class ExtractWebsiteDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'at least 1 url must be provided.' })
  @ArrayMaxSize(20, { message: 'up to 20 urls can be provided.' })
  @IsString({ each: true, message: 'each url must be a string.' })
  urls: string[];
}
