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

export type SeatCategory = string;

export type SeatStatus = 'available' | 'selected' | 'booked' | 'blocked' | 'reserved';

export type NumberingDirection = 'left-to-right' | 'right-to-left' | 'center-out';
export type LayoutOrientation = 'vertical' | 'horizontal';
export type RowLabelingDirection = 'top-to-bottom' | 'bottom-to-top';

export type LayoutPreset = 'fashion-show' | 'theater' | 'conference' | 'gala-event' | 'no-stage' | 'custom';
export type EditorMode = 'configure' | 'arrange';
export type ElementLayer = 'below' | 'above';

export interface LayoutConfig {
  rows: number;
  seatsPerRow: number;
  vipRows: number;
  curvature: number;
  seatingStartY: number;
  aisleAfterRow: number;
  rowAisleGap: number;
  aisleAfterSeat: number;
  seatAisleGap: number;
  numberingDirection: NumberingDirection;
  rowLabelingDirection: RowLabelingDirection;
  orientation: LayoutOrientation;
  seatSpacing: number;
  rowSpacing: number;
  seatRadius: number;
}

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  isCenter: boolean;
}

export interface SeatingSection {
  id: string;
  name: string;
  x: number;
  y: number;
  layoutConfig: LayoutConfig;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
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
  groupId?: string;
  layer?: ElementLayer;
  isGenerated?: boolean;
}

export interface SeatElement extends BaseElement {
  type: 'seat';
  label: string;
  category: SeatCategory;
  status: SeatStatus;
  radius: number;
  rowId?: string;
  sectionId?: string;
  price?: number;
}

export type RowLabelPosition = 'left' | 'right' | 'both' | 'none';
export type SeatLabelType = '1' | 'A' | 'a' | 'I' | 'i' | 'custom';

export interface RowElement extends BaseElement {
  type: 'row';
  seatCount: number;
  seatSpacing: number;
  seatRadius: number;
  seats: SeatElement[];
  curved: boolean;
  curveAmount?: number; // 0-100 curve intensity (replaces curveRadius/curveAngle for simpler UX)
  curveRadius?: number;
  curveAngle?: number;
  label: string;
  numberingDirection: NumberingDirection;
  startNumber: number;
  category: SeatCategory;
  sectionId?: string;
  // Row labeling options (optional with defaults in UI)
  rowLabelEnabled?: boolean;
  rowLabelPosition?: RowLabelPosition;
  rowDisplayedType?: string; // e.g., "Row", "Aisle", custom text
  // Seat labeling options (optional with defaults in UI)
  seatLabelType?: SeatLabelType; // Numbering scheme: 1,2,3 or A,B,C etc.
  seatDisplayedType?: string; // e.g., "Seat", "Chair", custom text
  // Section association
  sectionLabel?: string;
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
  width: number;   // Text box width
  height: number;  // Text box height
}

export type TableBookingType = 'by-seat' | 'by-table';
export type SeatDirection = 'clockwise' | 'counter-clockwise';

export interface TableElement extends BaseElement {
  type: 'table';
  width: number;
  height: number;
  shape: 'rectangle' | 'circle' | 'oval';
  seats: SeatElement[];
  seatCount: number;
  label: string;
  fill: string;
  // New properties
  category?: SeatCategory;
  openSpaces?: number; // Number of gaps/empty spaces in seating (for round tables)
  automaticRadius?: boolean; // Auto-calculate table radius based on seats (for round tables)
  sectionLabel?: string; // Section this table belongs to
  displayedLabel?: string; // Custom displayed label (different from internal label)
  labelVisible?: boolean; // Show/hide table label
  // Rectangular table chair distribution
  chairsUp?: number; // Chairs on top side
  chairsDown?: number; // Chairs on bottom side
  chairsLeft?: number; // Chairs on left side
  chairsRight?: number; // Chairs on right side
  // Seat labeling
  seatLabelType?: SeatLabelType; // 1,2,3 or A,B,C etc.
  seatStartAt?: number; // Starting number for seat labels
  seatDirection?: SeatDirection; // Clockwise or counter-clockwise
  seatDisplayedType?: string; // e.g., "Seat", "Chair"
  // Booking
  bookingType?: TableBookingType; // Book by seat or by table
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
  // New properties
  category?: SeatCategory;
  scale?: number; // Transform scale (0.5 to 2)
  sectionLabel?: string;
  displayedLabel?: string;
  entrance?: string; // e.g., "North", "South", etc.
}

export interface AreaElement extends BaseElement {
  type: 'area';
  areaType: 'rectangle' | 'ellipse' | 'polygon';
  // For rectangle and ellipse
  width?: number;
  height?: number;
  // For polygon - array of points relative to element position
  points?: Point[];
  label: string;
  displayedLabel?: string; // Display name (shown to customers)
  fill: string;
  stroke: string;
  strokeWidth: number;
  capacity?: number; // Optional capacity for GA areas
  category?: SeatCategory; // Category for pricing
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rectangle' | 'ellipse' | 'polygon';
  // For rectangle and ellipse
  width?: number;
  height?: number;
  // For polygon - array of points relative to element position
  points?: Point[];
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius?: number; // For rectangle
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

export interface BackgroundImage {
  src: string;          // Base64 data URL or external URL
  width: number;        // Original image width
  height: number;       // Original image height
  opacity: number;      // 0-1, default 0.3
  visible: boolean;     // Show/hide toggle
  locked: boolean;      // Prevent accidental selection
  scale: number;        // Scale factor from calibration
}

export interface MapData {
  id: string;
  name: string;
  description?: string;
  elements: MapElement[];
  width: number;
  height: number;
  backgroundColor: string;
  labelColor: string;
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
  categories: CategoryConfig[];
  layoutConfig?: LayoutConfig;
  backgroundImage?: BackgroundImage;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryConfig {
  id: string;
  name: string;
  color: string;
  price?: number;
}

export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface SelectionState {
  selectedIds: string[];
  selectionBounds: Bounds | null;
}

export interface HistoryEntry {
  elements: MapElement[];
  timestamp: number;
}

export interface EditorTool {
  id: string;
  name: string;
  icon: string;
  cursor: string;
}

export type ToolType =
  // Selection tools
  | 'select'          // V - Default pointer selection
  | 'selectSeats'     // X - Select seats only
  | 'brush'           // C - Brush selection
  | 'selectSameType'  // Z - Select all of same type
  | 'node'            // A - Node/anchor point editing
  // Seating tools
  | 'row'             // R - Single row of seats
  | 'rowSegmented'    // R (submenu) - Row with segments
  | 'multipleRows'    // R (submenu) - Multiple rows at once
  | 'roundTable'      // E - Round table with seats
  | 'rectTable'       // E (submenu) - Rectangular table
  | 'booth'           // B - Booth seating
  | 'boothSegmented'  // B (submenu) - Multiple booths along a path
  // Area tools
  | 'rectArea'        // G - Rectangular general admission area
  | 'ellipseArea'     // G (submenu) - Elliptical area
  | 'polyArea'        // G (submenu) - Polygonal area
  // Shape tools
  | 'rectangle'       // H - Rectangle shape
  | 'ellipse'         // H (submenu) - Ellipse shape
  | 'polygon'         // H (submenu) - Polygon shape
  // Other tools
  | 'line'            // L - Line/path
  | 'text'            // T - Text label
  | 'image'           // Image upload
  | 'icon'            // Icon from library
  | 'pan'             // Space - Pan/hand tool
  // Legacy (kept for compatibility)
  | 'seat'
  | 'section'
  | 'stage'
  | 'table'
  | 'circle';

export interface DatabaseMap {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  data: MapData;
  thumbnail_url: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseEvent {
  id: string;
  map_id: string;
  name: string;
  event_date: string | null;
  seat_status: Record<string, SeatStatus>;
  created_at: string;
}

export interface DatabaseGuest {
  id: string;
  event_id: string;
  name: string;
  email: string | null;
  importance_rank: number | null;
  category: string | null;
  notes: string | null;
  assigned_seat: string | null;
  created_at: string;
}

// Seat hold types for embeddable widget
export interface DatabaseSeatHold {
  id: string;
  event_id: string;
  seat_ids: string[];
  session_id: string;
  expires_at: string;
  created_at: string;
  released_at: string | null;
  confirmed_at: string | null;
}

// Extended seat status for widget (includes hold info)
export type WidgetSeatStatus = 'available' | 'selected' | 'held' | 'booked';

export interface SeatStatusInfo {
  status: WidgetSeatStatus;
  holdId?: string;
  expiresAt?: string;
  bookingRef?: string;
}

// Public API response types
export interface PublicEventResponse {
  event: {
    id: string;
    name: string;
    date: string | null;
    stripeEnabled?: boolean;
  };
  map: {
    elements: MapElement[];
    width: number;
    height: number;
    backgroundColor: string;
    categories: CategoryConfig[];
  };
  seatStatuses: Record<string, SeatStatusInfo>;
}

export interface HoldResponse {
  success: boolean;
  holdId?: string;
  expiresAt?: string;
  error?: string;
}

export interface ConfirmResponse {
  success: boolean;
  bookedSeats?: string[];
  bookingId?: string;
  error?: string;
}

// API Key types
export interface DatabaseApiKey {
  id: string;
  user_id: string;
  event_id: string;
  key_prefix: string;
  key_hash: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

// API key response (returned when creating - includes the actual key once)
export interface ApiKeyCreateResponse {
  id: string;
  key: string;  // Full key - only shown once!
  keyPrefix: string;
  name: string;
  eventId: string;
  createdAt: string;
}

// API key list response (never includes full key)
export interface ApiKeyListItem {
  id: string;
  keyPrefix: string;
  name: string;
  eventId: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

// Booking types
export interface DatabaseBooking {
  id: string;
  event_id: string;
  hold_id: string | null;
  api_key_id: string | null;
  seat_ids: string[];
  seat_count: number;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  booking_ref: string | null;
  amount_paid: number | null;
  currency: string;
  payment_provider: string | null;
  payment_intent_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  idempotency_key: string | null;
}

// Confirm request body (from customer's backend)
export interface ConfirmRequestBody {
  holdId: string;
  bookingRef?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  amountPaid?: number;        // In cents
  currency?: string;
  paymentProvider?: string;
  paymentIntentId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

// Stripe Connect types
export type StripeAccountStatus = 'pending' | 'active' | 'restricted' | 'disconnected';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed' | 'cancelled';

export interface StripeConnectInfo {
  stripeAccountId: string;
  stripeConnectedAt: string;
  stripeAccountStatus: StripeAccountStatus;
  stripeAccountName?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

// Extended event type with Stripe Connect info
export interface DatabaseEventWithStripe extends DatabaseEvent {
  stripe_account_id: string | null;
  stripe_connected_at: string | null;
  stripe_account_status: StripeAccountStatus | null;
}

// Extended booking type with payment status
export interface DatabaseBookingWithPayment extends DatabaseBooking {
  payment_status: PaymentStatus;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  ticket_code: string | null;
  ticket_sent_at: string | null;
  checked_in_at: string | null;
}

// Checkout request body (from widget to create Stripe session)
export interface CheckoutRequestBody {
  holdId: string;
  seatIds: string[];
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
}

// Checkout response
export interface CheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
}

// Stripe Connect status response
export interface StripeConnectStatusResponse {
  connected: boolean;
  accountId?: string;
  accountName?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  status?: StripeAccountStatus;
  error?: string;
}
