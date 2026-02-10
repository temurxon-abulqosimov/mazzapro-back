import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
    @ApiProperty({
        example: '123456',
        description: 'The verification code sent to your email',
    })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    token: string;
}
