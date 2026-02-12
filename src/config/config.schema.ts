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
});
