const repositoryBase = '/viveutrera';

export function routerBasename() {
  return window.location.pathname === repositoryBase || window.location.pathname.startsWith(`${repositoryBase}/`)
    ? repositoryBase
    : '/';
}

export function publicPath(path: string) {
  const cleanPath = path.replace(/^\/+/, '');
  const base = routerBasename().replace(/\/$/, '');
  return `${base}/${cleanPath}`;
}
