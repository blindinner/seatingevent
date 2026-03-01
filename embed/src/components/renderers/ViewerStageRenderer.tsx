import type { StageElement } from '../../types';

interface ViewerStageRendererProps {
  stage: StageElement;
}

export function ViewerStageRenderer({ stage }: ViewerStageRendererProps) {
  const renderShape = () => {
    switch (stage.shape) {
      case 'rounded':
        return (
          <rect
            x={stage.x}
            y={stage.y}
            width={stage.width}
            height={stage.height}
            rx={20}
            ry={20}
            fill={stage.fill}
          />
        );
      case 'semicircle':
        return (
          <path
            d={`
              M ${stage.x} ${stage.y + stage.height}
              L ${stage.x} ${stage.y + stage.height / 2}
              A ${stage.width / 2} ${stage.height / 2} 0 0 1 ${stage.x + stage.width} ${stage.y + stage.height / 2}
              L ${stage.x + stage.width} ${stage.y + stage.height}
              Z
            `}
            fill={stage.fill}
          />
        );
      default:
        return (
          <rect
            x={stage.x}
            y={stage.y}
            width={stage.width}
            height={stage.height}
            fill={stage.fill}
          />
        );
    }
  };

  return (
    <g transform={`rotate(${stage.rotation} ${stage.x + stage.width / 2} ${stage.y + stage.height / 2})`}>
      {renderShape()}
      <text
        x={stage.x + stage.width / 2}
        y={stage.y + stage.height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={16}
        fontWeight="bold"
        letterSpacing={2}
        pointerEvents="none"
      >
        {stage.label}
      </text>
    </g>
  );
}
