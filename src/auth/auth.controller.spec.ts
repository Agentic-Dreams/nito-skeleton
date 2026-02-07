import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call authService.register with dto', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };
      
      const expectedResult = {
        user: { id: '1', email: dto.email },
        accessToken: 'token',
        refreshToken: 'refresh',
      };
      
      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('login', () => {
    it('should call authService.login with dto', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
      };
      
      const expectedResult = {
        user: { id: '1', email: dto.email },
        accessToken: 'token',
        refreshToken: 'refresh',
      };
      
      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(dto);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getProfile', () => {
    it('should return current user', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        role: 'user',
      };

      const result = await controller.getProfile(mockUser);

      expect(result).toEqual(mockUser);
    });
  });
});
