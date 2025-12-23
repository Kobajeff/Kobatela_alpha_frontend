const truthyValues = new Set(['1', 'true', 'yes']);

const rawDisableProviders = process.env.NEXT_PUBLIC_DISABLE_PROVIDERS;
const disableProvidersFlag =
  typeof rawDisableProviders === 'string' &&
  truthyValues.has(rawDisableProviders.toLowerCase());

export const DEV_DISABLE_PROVIDERS =
  process.env.NODE_ENV === 'development' && disableProvidersFlag;
