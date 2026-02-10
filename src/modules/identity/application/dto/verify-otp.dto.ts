import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
    @ApiProperty({
        example: 'user@example.com',
        description: 'The email address associated with your account',
    })
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        example: '123456',
        description: 'The 6-digit OTP code sent to your email',
    })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    otp: string;
}
