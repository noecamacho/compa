// Which e2e targets are production: real-mode specs write data, so they never run there.
const PRODUCTION_HOST = "compa.lol";

export const isProductionUrl = (url: string): boolean => {
  const { hostname } = new URL(url);
  return hostname === PRODUCTION_HOST || hostname.endsWith(`.${PRODUCTION_HOST}`);
};
