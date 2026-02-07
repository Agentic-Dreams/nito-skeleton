import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),

  // Database
  DATABASE_URL: Joi.string().uri().required(),

  // JWT
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET must be at least 32 characters',
  }),
  JWT_EXPIRES_IN: Joi.string().default('24h'),

  // Frontend
  FRONTEND_URL: Joi.string().uri().required(),

  // SMTP (optional)
  SMTP_HOST: Joi.string().hostname().optional(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  SMTP_FROM_EMAIL: Joi.string().email().optional(),
  SMTP_FROM_NAME: Joi.string().default('Nito App'),
});
