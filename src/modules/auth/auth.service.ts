import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto, LoginDto } from './dtos/auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AUTH_MESSAGES } from './constants/auth.messages';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException(AUTH_MESSAGES.EMAIL_ALREADY_REGISTERED);

    const hashed = await bcrypt.hash(dto.password, 10);
    const token = uuidv4();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.create({
      data: {
        ...dto,
        password: hashed,
        emailVerificationToken: token,
        emailVerificationExpiry: expiry,
      },
    });

    await this.mailService.sendVerificationEmail(dto.email, dto.name, token);

    return { message: AUTH_MESSAGES.REGISTRATION_SUCCESS };
  }

async verifyEmail(token: string) {
  console.log(token);
  
  const user = await this.prisma.user.findFirst({
    where: { emailVerificationToken: token },
  });
  console.log(user);
  

  if (!user) {
    throw new BadRequestException(AUTH_MESSAGES.INVALID_VERIFICATION_TOKEN);
  }
  

  if (!user.emailVerificationExpiry) {
    throw new BadRequestException(AUTH_MESSAGES.INVALID_VERIFICATION_TOKEN);
  }

  if (new Date() > new Date(user.emailVerificationExpiry)) {
    throw new BadRequestException(AUTH_MESSAGES.VERIFICATION_TOKEN_EXPIRED);
  }

  // already verified guard (optional but important)
  if (user.isEmailVerified) {
    return { message: AUTH_MESSAGES.EMAIL_VERIFIED_SUCCESS };
  }

  await this.prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    },
  });

  return { message: AUTH_MESSAGES.EMAIL_VERIFIED_SUCCESS };
}

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    if (user.isEmailVerified) {
      throw new BadRequestException(AUTH_MESSAGES.EMAIL_ALREADY_VERIFIED);
    }

    const token = uuidv4();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: token,
        emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await this.mailService.sendVerificationEmail(user.email, user.name, token);
    return { message: AUTH_MESSAGES.VERIFICATION_EMAIL_RESENT };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(AUTH_MESSAGES.EMAIL_NOT_VERIFIED);
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}