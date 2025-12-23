import { Link } from "react-router-dom";

type Props = {
  logoSrc: string;
  to?: string;
  className?: string;
};

export default function SleddingLogo({ logoSrc, to = "/", className = "" }: Props) {
  return (
    <Link to={to} className={`relative inline-block group ${className}`} aria-label="Go home">
      {/* Scene overlay (snow hill + ice pool). Does not affect layout. */}
      <span className="pointer-events-none absolute left-[-52px] top-[54px] z-0 block h-[190px] w-[360px] opacity-0 scale-95 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-100">
        {/* Snow hill: scalable vector graphics so it looks like a hill, not a blurry pill */}
        <svg
          viewBox="0 0 360 190"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Hill base */}
          <path
            d="M 10 120
               C 60 40, 150 35, 230 70
               C 290 95, 330 130, 350 165
               L 10 185 Z"
            fill="rgba(255,255,255,0.22)"
          />
          {/* Hill highlight ridge */}
          <path
            d="M 28 122
               C 78 58, 155 55, 222 78
               C 270 94, 310 118, 334 142"
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Ice pool */}
          <ellipse
            cx="285"
            cy="162"
            rx="58"
            ry="20"
            fill="rgba(125, 211, 252, 0.18)"
            stroke="rgba(255,255,255,0.20)"
            strokeWidth="2"
          />

          {/* Ice shine */}
          <path
            d="M 250 160
               C 265 148, 300 148, 315 160"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </span>

      {/* Penguin */}
      <img
        src={logoSrc}
        alt="ManiFed"
        className={[
          "relative z-10",
          "h-28",
          "will-change-transform",
          "group-hover:animate-penguin-sled-into-pool-then-walk-back",
        ].join(" ")}
        draggable={false}
      />
    </Link>
  );
}
