export function FoodIcon() {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <title>Producto</title>
        <path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18M19 3c-3 2-4 5-4 9h4m0-9v18" />
      </svg>
    </span>
  );
}

export function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <title>Editar</title>
      <path d="m15 5 4 4M4 20l4-.8L20 7a2.8 2.8 0 0 0-4-4L4.8 15.2 4 20Z" />
    </svg>
  );
}

const top = [38, 14];
const bottom = [38, 66];
const left = [7, 40];
const right = [69, 40];
const upperLeft = [23, 14];
const upperRight = [53, 14];
const lowerLeft = [23, 66];
const lowerRight = [53, 66];

export function TableIcon({ name, capacity, active }: { name: string; capacity: number; active: boolean }) {
  const seats = capacity <= 1 ? [top] :
    capacity === 2 ? [left, right] :
    capacity === 3 ? [top, left, right] :
    capacity === 4 ? [top, left, right, bottom] :
    capacity === 5 ? [upperLeft, upperRight, left, right, bottom] :
    capacity === 6 ? [upperLeft, upperRight, left, right, lowerLeft, lowerRight] :
    capacity === 7 ? [upperLeft, top, upperRight, left, right, lowerLeft, lowerRight] :
    [upperLeft, upperRight, [7, 29], [7, 51], [69, 29], [69, 51], lowerLeft, lowerRight];
  const label = name.match(/\d+$/)?.[0]?.slice(-4).padStart(2, "0") ?? name.slice(0, 2).toUpperCase();
  const chair = active ? "#0F766E" : "#94A3B8";
  return (
    <svg viewBox="0 0 76 80" width="76" height="80" aria-hidden="true" className="block shrink-0">
      <title>Representación de mesa</title>
      {seats.map(([x, y]) => (
        <rect key={`${x}:${y}`} x={x - 4.5} y={y - 4.5} width="9" height="9" rx="2.3" fill={chair} />
      ))}
      <rect x="17" y="23" width="42" height="34" rx="8" fill={active ? "#CCFBF1" : "#E2E8F0"} stroke={chair} strokeWidth="1.25" />
      <text x="38" y="44" textAnchor="middle" fontSize={label.length > 2 ? "11" : "15"} fontWeight="700" fill="#172B4D">{label}</text>
    </svg>
  );
}
