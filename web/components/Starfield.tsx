// The banner's commit-graph constellation, faint, behind the page header.
export default function Starfield() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 w-full"
      viewBox="0 0 1200 288"
      preserveAspectRatio="xMidYMin slice"
    >
      <g stroke="#1d2430" strokeWidth="1.5">
        <line x1="705" y1="165" x2="785" y2="145" />
        <line x1="785" y1="145" x2="865" y2="125" />
        <line x1="865" y1="125" x2="945" y2="105" />
        <line x1="785" y1="145" x2="845" y2="195" />
        <line x1="845" y1="195" x2="925" y2="175" />
        <line x1="925" y1="175" x2="945" y2="105" />
      </g>
      <g shapeRendering="crispEdges">
        <rect x="702" y="162" width="7" height="7" fill="#e8c170" opacity="0.55" />
        <rect x="782" y="142" width="7" height="7" fill="#e8c170" opacity="0.55" />
        <rect x="862" y="122" width="7" height="7" fill="#e8c170" opacity="0.55" />
        <rect x="942" y="102" width="7" height="7" fill="#e8c170" opacity="0.55" />
        <rect x="842" y="192" width="7" height="7" fill="#5eead4" opacity="0.55" />
        <rect x="922" y="172" width="7" height="7" fill="#5eead4" opacity="0.55" />
        {[
          [80, 60], [170, 130], [260, 40], [340, 100], [440, 60], [520, 150],
          [600, 50], [1020, 70], [1100, 150], [1160, 60], [90, 200], [420, 210],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" fill="#2b3342" />
        ))}
      </g>
    </svg>
  );
}
