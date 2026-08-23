import type { CSSProperties } from "react";
import "./thinking-indicator.css";

const cells = [
  [0, 0, 810],
  [1, 0, 490],
  [2, 0, 810],
  [0, 1, 490],
  [1, 1, -180],
  [2, 1, 490],
  [0, 2, 810],
  [1, 2, 490],
  [2, 2, 810],
] as const;

export function WidgetThinkingIndicator() {
  return (
    <div className="thinking-indicator" role="status" aria-live="polite">
      <span className="thinking-glyph" aria-hidden="true">
        <span className="thinking-lattice">
          {cells.map(([column, row, delay]) => (
            <span
              key={`${column}-${row}`}
              className="thinking-cell"
              style={
                {
                  left: `${column * 6}px`,
                  top: `${row * 6}px`,
                  animationDelay: `${delay}ms`,
                } as CSSProperties
              }
            />
          ))}
        </span>
      </span>
      <span className="thinking-label">Thinking…</span>
    </div>
  );
}
