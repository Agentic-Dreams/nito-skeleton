import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';
import { users } from '../database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const database = this.db.getDatabase();
    
    // Check if email exists
    const existing = await database.query.users.findFirst({
      where: eq(users.email, dto.email),
    });
    
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Create user
    const [user] = await database
      .insert(users)
      .values({
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      });

    // Asegurar que role no es null
    const userPayload = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role || 'user',
    };

    const tokens = await this.generateTokens(userPayload);
    
    return {
      user: userPayload,
      ...tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const database = this.db.getDatabase();
    
    const user = await database.query.users.findFirst({
      where: eq(users.email, dto.email),
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role || 'user',
    };

    const tokens = await this.generateTokens(userPayload);
    
    return {
      user: userPayload,
      ...tokens,
    };
  }

  private async generateTokens(user: any) {
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role 
    };

    const accessToken = this.jwtService.sign(payload);
    
    // Simple refresh token (in production, store hashed in DB)
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
