import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';

// Register a nice font
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Inter',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  logo: {
    maxWidth: 120,
    maxHeight: 40,
    objectFit: 'contain',
  },
  ticketBadge: {
    backgroundColor: '#18181b',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  ticketBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 600,
  },
  mainContent: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  eventDetails: {
    flex: 1,
    paddingRight: 20,
  },
  eventName: {
    fontSize: 24,
    fontWeight: 700,
    color: '#18181b',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  detailIcon: {
    width: 16,
    height: 16,
    marginRight: 10,
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 10,
    color: '#71717a',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 12,
    color: '#18181b',
    fontWeight: 500,
  },
  qrSection: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
  },
  qrCode: {
    width: 120,
    height: 120,
  },
  ticketCodeContainer: {
    backgroundColor: '#fafafa',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  ticketCodeLabel: {
    fontSize: 10,
    color: '#71717a',
    marginBottom: 6,
    textAlign: 'center',
  },
  ticketCode: {
    fontSize: 28,
    fontWeight: 700,
    color: '#18181b',
    textAlign: 'center',
    letterSpacing: 2,
  },
  guestSection: {
    backgroundColor: '#f4f4f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  guestLabel: {
    fontSize: 10,
    color: '#71717a',
    marginBottom: 4,
  },
  guestName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#18181b',
  },
  guestEmail: {
    fontSize: 11,
    color: '#52525b',
    marginTop: 2,
  },
  seatsSection: {
    marginBottom: 20,
  },
  seatsSectionTitle: {
    fontSize: 10,
    color: '#71717a',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  seatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  seatLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#18181b',
  },
  seatCategory: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 2,
  },
  seatPrice: {
    fontSize: 12,
    fontWeight: 500,
    color: '#18181b',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#18181b',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 700,
    color: '#18181b',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    color: '#a1a1aa',
    textAlign: 'center',
  },
});

export interface TicketPDFProps {
  logoUrl: string | null;
  brandColor: string | null;
  eventName: string;
  eventDate: string;
  eventTime: string | null;
  eventLocation: string | null;
  ticketCode: string;
  qrCodeDataUrl: string;
  customerName: string;
  customerEmail: string;
  seats: Array<{ label: string; category: string; price: number }>;
  totalAmount: number;
  currency: string;
}

function formatCurrency(amount: number, currency: string): string {
  // Convert from smallest currency unit (agorot/cents) to main unit
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100);
}

export function TicketPDF({
  logoUrl,
  eventName,
  eventDate,
  eventTime,
  eventLocation,
  ticketCode,
  qrCodeDataUrl,
  customerName,
  customerEmail,
  seats,
  totalAmount,
  currency,
}: TicketPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {logoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={logoUrl} style={styles.logo} />
          ) : (
            <Text style={{ fontSize: 18, fontWeight: 700, color: '#18181b' }}>Seated</Text>
          )}
          <View style={styles.ticketBadge}>
            <Text style={styles.ticketBadgeText}>E-TICKET</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <View style={styles.eventDetails}>
            <Text style={styles.eventName}>{eventName}</Text>

            <View style={styles.detailRow}>
              <View>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{eventDate}</Text>
              </View>
            </View>

            {eventTime && (
              <View style={styles.detailRow}>
                <View>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>{eventTime}</Text>
                </View>
              </View>
            )}

            {eventLocation && (
              <View style={styles.detailRow}>
                <View>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{eventLocation}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.qrSection}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={qrCodeDataUrl} style={styles.qrCode} />
          </View>
        </View>

        {/* Ticket Code */}
        <View style={styles.ticketCodeContainer}>
          <Text style={styles.ticketCodeLabel}>TICKET CODE</Text>
          <Text style={styles.ticketCode}>{ticketCode}</Text>
        </View>

        {/* Guest Info */}
        <View style={styles.guestSection}>
          <Text style={styles.guestLabel}>TICKET HOLDER</Text>
          <Text style={styles.guestName}>{customerName}</Text>
          <Text style={styles.guestEmail}>{customerEmail}</Text>
        </View>

        {/* Seats */}
        {seats.length > 0 && (
          <View style={styles.seatsSection}>
            <Text style={styles.seatsSectionTitle}>Your Seats</Text>
            {seats.map((seat, index) => (
              <View key={index} style={styles.seatRow}>
                <View>
                  <Text style={styles.seatLabel}>Seat {seat.label}</Text>
                  <Text style={styles.seatCategory}>{seat.category}</Text>
                </View>
                <Text style={styles.seatPrice}>{formatCurrency(seat.price, currency)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>{formatCurrency(totalAmount, currency)}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Present this ticket at the entrance. Keep this ticket safe - it is required for entry.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
