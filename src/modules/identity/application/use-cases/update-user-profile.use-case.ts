import { Injectable, Inject } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { EntityNotFoundException } from '@common/exceptions';

@Injectable()
export class UpdateUserProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) { }

  async execute(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }

    user.updateProfile(dto.fullName, dto.avatarUrl, dto.lat, dto.lng);
    return this.userRepository.save(user);
  }
}
