// Simplified types for the embed widget
// These mirror the main app types but are self-contained

export type ElementType =
  | 'seat'
  | 'row'
  | 'section'
  | 'stage'
  | 'rectangle'
  | 'circle'
  | 'polygon'
  | 'line'
  | 'text'
  | 'table'
  | 'bar'
  | 'pillar'
  | 'image'
  | 'booth'
  | 'area'
  | 'shape';

export type SeatCategory = 'vip' | 'regular' | 'accessible' | 'restricted' | 'premium';
export type WidgetSeatStatus = 'available' | 'selected' | 'held' | 'booked';

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  rotation: number;
  locked: boolean;
  visible: boolean;
  name?: string;
  layer?: 'below' | 'above';
}

export interface SeatElement extends BaseElement {
  type: 'seat';
  label: string;
  category: SeatCategory;
  status: string;
  radius: number;
  rowId?: string;
  sectionId?: string;
  price?: number;
}

export type RowLabelPosition = 'left' | 'right' | 'both' | 'none';

export interface RowElement extends BaseElement {
  type: 'row';
  seatCount: number;
  seatSpacing: number;
  seatRadius: number;
  seats: SeatElement[];
  curved: boolean;
  curveAmount?: number;
  curveRadius?: number;
  curveAngle?: number;
  label: string;
  numberingDirection: 'left-to-right' | 'right-to-left' | 'center-out';
  startNumber: number;
  category: SeatCategory;
  sectionId?: string;
  rowLabelPosition?: RowLabelPosition;
}

export interface SectionElement extends BaseElement {
  type: 'section';
  rows: RowElement[];
  label: string;
  rowSpacing: number;
  category: SeatCategory;
}

export interface StageElement extends BaseElement {
  type: 'stage';
  width: number;
  height: number;
  label: string;
  shape: 'rectangle' | 'rounded' | 'semicircle';
  fill: string;
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface PolygonElement extends BaseElement {
  type: 'polygon';
  points: Point[];
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface LineElement extends BaseElement {
  type: 'line';
  points: Point[];
  stroke: string;
  strokeWidth: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  align: 'left' | 'center' | 'right';
}

export interface TableElement extends BaseElement {
  type: 'table';
  width: number;
  height: number;
  shape: 'rectangle' | 'circle' | 'oval';
  seats: SeatElement[];
  seatCount: number;
  label: string;
  fill: string;
  category?: SeatCategory;
}

export interface BarElement extends BaseElement {
  type: 'bar';
  width: number;
  height: number;
  label: string;
  fill: string;
}

export interface PillarElement extends BaseElement {
  type: 'pillar';
  radius: number;
  fill: string;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  width: number;
  height: number;
  opacity: number;
}

export interface BoothElement extends BaseElement {
  type: 'booth';
  width: number;
  height: number;
  label: string;
  boothNumber: string;
  fill: string;
  stroke: string;
  category?: SeatCategory;
  scale?: number;
}

export interface AreaElement extends BaseElement {
  type: 'area';
  areaType: 'rectangle' | 'ellipse' | 'polygon';
  width?: number;
  height?: number;
  points?: Point[];
  label: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  capacity?: number;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rectangle' | 'ellipse' | 'polygon';
  width?: number;
  height?: number;
  points?: Point[];
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius?: number;
}

export type MapElement =
  | SeatElement
  | RowElement
  | SectionElement
  | StageElement
  | RectangleElement
  | CircleElement
  | PolygonElement
  | LineElement
  | TextElement
  | TableElement
  | BarElement
  | PillarElement
  | ImageElement
  | BoothElement
  | AreaElement
  | ShapeElement;

export interface CategoryConfig {
  id: SeatCategory;
  name: string;
  color: string;
  price?: number;
}

export interface SeatStatusInfo {
  status: WidgetSeatStatus;
  holdId?: string;
  expiresAt?: string;
  bookingRef?: string;
}

export interface EventData {
  id: string;
  name: string;
  date: string | null;
  stripeEnabled?: boolean;
}

export interface MapData {
  elements: MapElement[];
  width: number;
  height: number;
  backgroundColor: string;
  categories: CategoryConfig[];
}

export interface PublicEventResponse {
  event: EventData;
  map: MapData;
  seatStatuses: Record<string, SeatStatusInfo>;
}

export interface HoldResponse {
  success: boolean;
  holdId?: string;
  expiresAt?: string;
  error?: string;
}

export interface ReleaseResponse {
  success: boolean;
  error?: string;
}

export interface CheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
}

// Widget configuration
export interface WidgetConfig {
  container: string | HTMLElement;
  eventId: string;
  apiBaseUrl?: string;
  maxSeats?: number;
  theme?: 'light' | 'dark';
  showLegend?: boolean;
  showZoomControls?: boolean;
  /**
   * Custom background color for the seat map canvas.
   * Defaults to the map's stored background color.
   * Example: '#1a1a2e', 'rgb(26, 26, 46)', 'transparent'
   */
  canvasBackgroundColor?: string;
  /**
   * Override category prices from the client's system.
   * Keys should match category names (e.g., "VIP", "Premium", "Gold")
   * Values are the prices in the client's currency.
   *
   * Example:
   * ```
   * categoryPrices: {
   *   'Gold': 200,
   *   'Silver': 150,
   *   'Bronze': 100
   * }
   * ```
   */
  categoryPrices?: Record<string, number>;
  onSelectionChange?: (seats: SelectedSeat[]) => void;
  onCheckout?: (seats: SelectedSeat[], holdId: string) => void;
  onError?: (error: Error) => void;
  onLoad?: () => void;
}

export interface SelectedSeat {
  id: string;
  label: string;
  category: SeatCategory;
  price?: number;
  rowLabel?: string;
  sectionLabel?: string;
}
