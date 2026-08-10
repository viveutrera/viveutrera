import { publicPath } from '../../lib/routing';

export function LanguageLegend({ code, name }: { code: string; name: string }) {
  return (
    <span className="language-legend">
      <img src={publicPath(`flags/flag-${code}.png`)} alt="" />
      <span>{name}</span>
    </span>
  );
}
