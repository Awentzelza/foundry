import type { AppMeta } from '@/types/app';

interface AppTileProps {
  meta: AppMeta;
  onClick: () => void;
}

export default function AppTile({ meta, onClick }: AppTileProps) {
  return (
    <button
      type="button"
      className="foundry-tile"
      onClick={onClick}
      aria-label={`Open ${meta.name}`}
    >
      <span className="foundry-tile__status" aria-hidden />
      <span className="foundry-tile__icon" aria-hidden>
        {meta.icon}
      </span>
      <div className="foundry-tile__meta">
        <p className="foundry-tile__name">{meta.name}</p>
        <p className="foundry-tile__desc">{meta.description}</p>
      </div>
    </button>
  );
}
