import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ForgotPasswordDto {
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
}
