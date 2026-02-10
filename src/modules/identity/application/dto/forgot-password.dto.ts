import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
    @ApiProperty({
        example: 'user@example.com',
        description: 'The email address associated with your account',
    })
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string;
}
