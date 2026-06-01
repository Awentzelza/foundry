import type { AppMeta } from '@/types/app';

interface AppTileProps {
  meta: AppMeta;
  /** 1-based position in the directory, shown as a hallmark index. */
  index?: number;
  onClick: () => void;
}

export default function AppTile({ meta, index, onClick }: AppTileProps) {
  const hallmark =
    index != null ? `No. ${String(index).padStart(2, '0')}` : 'Foundry';
  return (
    <button
      type="button"
      className="foundry-tile"
      onClick={onClick}
      aria-label={`Open ${meta.name}`}
    >
      <span className="foundry-tile__index" aria-hidden>
        {hallmark}
      </span>
      <div className="foundry-tile__meta">
        <p className="foundry-tile__name">{meta.name}</p>
        <p className="foundry-tile__desc">{meta.description}</p>
      </div>
    </button>
  );
}
