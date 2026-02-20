import Joi from 'joi';
export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string()
    .regex(/^(\d+(ms|s|m|h|d|w|y))$/) // This regex ensure values like "15m", "1h", "7d"
    .required(), 
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .regex(/^(\d+(ms|s|m|h|d|w|y))$/) // This regex ensure values like "15m", "1h", "7d"
    .required(),
  SENDGRID_API_KEY: Joi.string().required(),
  SENDGRID_FROM_EMAIL: Joi.string().email().required(),
  PASSWORD_RESET_TTL: Joi.string()
    .regex(/^(\d+(ms|s|m|h|d|w|y))$/)
    .default('15m'),
  AWS_REGIONS: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_S3_BUCKET_NAME: Joi.string().required(),
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),
});
