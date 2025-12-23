const truthyValues = new Set(['1', 'true', 'yes']);

const isDevFlagEnabled = (value: string | undefined) => {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }

  return typeof value === 'string' && truthyValues.has(value.toLowerCase());
};

export const DEV_DISABLE_GLOBAL_BANNERS = isDevFlagEnabled(
  process.env.NEXT_PUBLIC_DISABLE_PROVIDERS
);
export const DEV_DISABLE_CONNECTION_BANNER = isDevFlagEnabled(
  process.env.NEXT_PUBLIC_DISABLE_CONNECTION_BANNER
);
export const DEV_DISABLE_DEMO_BANNER = isDevFlagEnabled(
  process.env.NEXT_PUBLIC_DISABLE_DEMO_BANNER
);

export const DEV_DISABLE_PROVIDERS = DEV_DISABLE_GLOBAL_BANNERS;
