import Joi from 'joi';

export interface EnvVars {
  PORT: number;

  MONGODB_URI: string;

  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;

  PAYMENT_PROVIDER: 'stripe' | 'adyen' | 'paymob';

  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;

  APP_URL: string;

  SENTRY_DSN?: string;
}

export const validationSchema: Joi.ObjectSchema<EnvVars> = Joi.object<EnvVars>({
  PORT: Joi.number().port().default(3000),

  MONGODB_URI: Joi.string().uri().required(),

  JWT_SECRET: Joi.string().min(10).required(),

  JWT_EXPIRES_IN: Joi.string().required(),

  JWT_REFRESH_SECRET: Joi.string().min(10).required(),

  JWT_REFRESH_EXPIRES_IN: Joi.string().required(),

  PAYMENT_PROVIDER: Joi.string().valid('stripe', 'adyen', 'paymob').required(),

  STRIPE_SECRET_KEY: Joi.when('PAYMENT_PROVIDER', {
    is: 'stripe',
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),

  STRIPE_WEBHOOK_SECRET: Joi.when('PAYMENT_PROVIDER', {
    is: 'stripe',
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),

  APP_URL: Joi.string().uri().required(),

  SENTRY_DSN: Joi.string().uri().optional(),
});
