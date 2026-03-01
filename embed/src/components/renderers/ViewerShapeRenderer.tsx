import type { ShapeElement, RectangleElement, CircleElement, PolygonElement, LineElement, TextElement, AreaElement, BoothElement, BarElement, PillarElement, ImageElement } from '../../types';

// Generic shape renderer for non-interactive elements
interface ViewerShapeRendererProps {
  shape: ShapeElement;
}

export function ViewerShapeRenderer({ shape }: ViewerShapeRendererProps) {
  switch (shape.shapeType) {
    case 'rectangle':
      return (
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width || 0}
          height={shape.height || 0}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          rx={shape.cornerRadius || 0}
        />
      );
    case 'ellipse':
      return (
        <ellipse
          cx={shape.x + (shape.width || 0) / 2}
          cy={shape.y + (shape.height || 0) / 2}
          rx={(shape.width || 0) / 2}
          ry={(shape.height || 0) / 2}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
        />
      );
    case 'polygon':
      if (!shape.points || shape.points.length < 3) return null;
      const pointsString = shape.points.map((p) => `${shape.x + p.x},${shape.y + p.y}`).join(' ');
      return (
        <polygon
          points={pointsString}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
        />
      );
    default:
      return null;
  }
}

// Rectangle element renderer
interface ViewerRectangleRendererProps {
  rect: RectangleElement;
}

export function ViewerRectangleRenderer({ rect }: ViewerRectangleRendererProps) {
  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      fill={rect.fill}
      stroke={rect.stroke}
      strokeWidth={rect.strokeWidth}
      rx={rect.cornerRadius}
      transform={`rotate(${rect.rotation} ${rect.x + rect.width / 2} ${rect.y + rect.height / 2})`}
    />
  );
}

// Circle element renderer
interface ViewerCircleRendererProps {
  circle: CircleElement;
}

export function ViewerCircleRenderer({ circle }: ViewerCircleRendererProps) {
  return (
    <circle
      cx={circle.x}
      cy={circle.y}
      r={circle.radius}
      fill={circle.fill}
      stroke={circle.stroke}
      strokeWidth={circle.strokeWidth}
    />
  );
}

// Polygon element renderer
interface ViewerPolygonRendererProps {
  polygon: PolygonElement;
}

export function ViewerPolygonRenderer({ polygon }: ViewerPolygonRendererProps) {
  if (!polygon.points || polygon.points.length < 3) return null;
  const pointsString = polygon.points.map((p) => `${polygon.x + p.x},${polygon.y + p.y}`).join(' ');
  return (
    <polygon
      points={pointsString}
      fill={polygon.fill}
      stroke={polygon.stroke}
      strokeWidth={polygon.strokeWidth}
    />
  );
}

// Line element renderer
interface ViewerLineRendererProps {
  line: LineElement;
}

export function ViewerLineRenderer({ line }: ViewerLineRendererProps) {
  if (!line.points || line.points.length < 2) return null;
  const pathData = line.points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${line.x + p.x} ${line.y + p.y}`)
    .join(' ');
  return (
    <path
      d={pathData}
      fill="none"
      stroke={line.stroke}
      strokeWidth={line.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

// Text element renderer
interface ViewerTextRendererProps {
  text: TextElement;
}

export function ViewerTextRenderer({ text }: ViewerTextRendererProps) {
  return (
    <text
      x={text.x}
      y={text.y}
      textAnchor={text.align === 'left' ? 'start' : text.align === 'right' ? 'end' : 'middle'}
      dominantBaseline="middle"
      fill={text.fill}
      fontSize={text.fontSize}
      fontFamily={text.fontFamily}
      transform={`rotate(${text.rotation} ${text.x} ${text.y})`}
    >
      {text.text}
    </text>
  );
}

// Area element renderer
interface ViewerAreaRendererProps {
  area: AreaElement;
}

export function ViewerAreaRenderer({ area }: ViewerAreaRendererProps) {
  const renderShape = () => {
    switch (area.areaType) {
      case 'rectangle':
        return (
          <rect
            x={area.x}
            y={area.y}
            width={area.width || 0}
            height={area.height || 0}
            fill={area.fill}
            stroke={area.stroke}
            strokeWidth={area.strokeWidth}
            strokeDasharray="8 4"
            rx={4}
          />
        );
      case 'ellipse':
        return (
          <ellipse
            cx={area.x + (area.width || 0) / 2}
            cy={area.y + (area.height || 0) / 2}
            rx={(area.width || 0) / 2}
            ry={(area.height || 0) / 2}
            fill={area.fill}
            stroke={area.stroke}
            strokeWidth={area.strokeWidth}
            strokeDasharray="8 4"
          />
        );
      case 'polygon':
        if (!area.points || area.points.length < 3) return null;
        const pointsString = area.points.map((p) => `${area.x + p.x},${area.y + p.y}`).join(' ');
        return (
          <polygon
            points={pointsString}
            fill={area.fill}
            stroke={area.stroke}
            strokeWidth={area.strokeWidth}
            strokeDasharray="8 4"
          />
        );
      default:
        return null;
    }
  };

  const getLabelPosition = () => {
    switch (area.areaType) {
      case 'polygon':
        if (!area.points || area.points.length === 0) return { x: area.x, y: area.y };
        const sumX = area.points.reduce((sum, p) => sum + p.x, 0);
        const sumY = area.points.reduce((sum, p) => sum + p.y, 0);
        return { x: area.x + sumX / area.points.length, y: area.y + sumY / area.points.length };
      default:
        return { x: area.x + (area.width || 0) / 2, y: area.y + (area.height || 0) / 2 };
    }
  };

  const labelPos = getLabelPosition();

  return (
    <g>
      {renderShape()}
      <text
        x={labelPos.x}
        y={labelPos.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={area.stroke}
        fontSize={14}
        fontWeight="500"
        pointerEvents="none"
      >
        {area.label}
      </text>
      {area.capacity && (
        <text
          x={labelPos.x}
          y={labelPos.y + 18}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={area.stroke}
          fontSize={11}
          pointerEvents="none"
        >
          ({area.capacity} capacity)
        </text>
      )}
    </g>
  );
}

// Booth element renderer
interface ViewerBoothRendererProps {
  booth: BoothElement;
}

export function ViewerBoothRenderer({ booth }: ViewerBoothRendererProps) {
  const scale = booth.scale || 1;
  const scaledWidth = booth.width * scale;
  const scaledHeight = booth.height * scale;

  return (
    <g transform={`rotate(${booth.rotation} ${booth.x} ${booth.y})`}>
      <rect
        x={booth.x - scaledWidth / 2}
        y={booth.y - scaledHeight / 2}
        width={scaledWidth}
        height={scaledHeight}
        fill={booth.fill}
        stroke={booth.stroke}
        strokeWidth={2}
        rx={4}
      />
      <text
        x={booth.x}
        y={booth.y - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={12}
        fontWeight="600"
        pointerEvents="none"
      >
        {booth.boothNumber}
      </text>
      <text
        x={booth.x}
        y={booth.y + 8}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(255,255,255,0.7)"
        fontSize={10}
        pointerEvents="none"
      >
        {booth.label}
      </text>
    </g>
  );
}

// Bar element renderer
interface ViewerBarRendererProps {
  bar: BarElement;
}

export function ViewerBarRenderer({ bar }: ViewerBarRendererProps) {
  return (
    <g transform={`rotate(${bar.rotation} ${bar.x + bar.width / 2} ${bar.y + bar.height / 2})`}>
      <rect
        x={bar.x}
        y={bar.y}
        width={bar.width}
        height={bar.height}
        fill={bar.fill}
        rx={4}
      />
      <text
        x={bar.x + bar.width / 2}
        y={bar.y + bar.height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={12}
        fontWeight="500"
        pointerEvents="none"
      >
        {bar.label}
      </text>
    </g>
  );
}

// Pillar element renderer
interface ViewerPillarRendererProps {
  pillar: PillarElement;
}

export function ViewerPillarRenderer({ pillar }: ViewerPillarRendererProps) {
  return (
    <circle cx={pillar.x} cy={pillar.y} r={pillar.radius} fill={pillar.fill} />
  );
}

// Image element renderer
interface ViewerImageRendererProps {
  image: ImageElement;
}

export function ViewerImageRenderer({ image }: ViewerImageRendererProps) {
  return (
    <image
      x={image.x}
      y={image.y}
      width={image.width}
      height={image.height}
      href={image.src}
      opacity={image.opacity}
      transform={`rotate(${image.rotation} ${image.x + image.width / 2} ${image.y + image.height / 2})`}
      preserveAspectRatio="xMidYMid meet"
    />
  );
}
