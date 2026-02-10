import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
    @ApiProperty({
        example: '123456',
        description: 'The reset code sent to your email',
    })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    token: string;

    @ApiProperty({
        example: 'NewPassword123!',
        description: 'The new password',
        minLength: 6,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    newPassword: string;
}
