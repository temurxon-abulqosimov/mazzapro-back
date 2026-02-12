import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
    @ApiProperty({
        example: '998901234567',
        description: 'The phone number associated with your account',
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^998\d{9}$/, {
        message: 'Phone number must be in format 998XXXXXXXXX (12 digits)',
    })
    phoneNumber: string;

    @ApiProperty({
        example: '123456',
        description: 'The 6-digit OTP code sent to your phone',
    })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    otp: string;
}
