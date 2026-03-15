'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Language = 'he' | 'en';

export default function TermsPage() {
  const [lang, setLang] = useState<Language>('en');

  return (
    <div className="min-h-screen bg-[#0a0a09]">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0a09]/80 border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="group">
            <Image
              src="/logo.png"
              alt="Rendeza"
              width={168}
              height={168}
              className="max-h-10 w-auto group-hover:scale-105 transition-all duration-300"
            />
          </Link>

          {/* Language Toggle */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setLang('en')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                lang === 'en'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('he')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                lang === 'he'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              עברית
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-8">
        <div className={lang === 'he' ? 'text-right' : 'text-left'} dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <p className="text-xs font-medium tracking-widest uppercase text-amber-400 mb-4">
            {lang === 'he' ? 'מסמך משפטי' : 'Legal Document'}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {lang === 'he' ? (
              <>תנאי <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">שימוש</span></>
            ) : (
              <>Terms of <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Use</span></>
            )}
          </h1>
          <p className="text-zinc-500 text-sm border-t border-zinc-800 pt-4 mt-4">
            {lang === 'he'
              ? 'עודכן לאחרונה: מרץ 2026 · גרסה 1.0 · rendeza.com'
              : 'Last updated: March 2026 · Version 1.0 · rendeza.com'
            }
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pb-20" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        {lang === 'he' ? <HebrewContent /> : <EnglishContent />}
      </div>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 pb-12 text-center">
        <p className="text-zinc-500 text-sm">
          © 2026 Rendeza · <Link href="/" className="text-amber-400 hover:underline">rendeza.com</Link>
        </p>
        <p className="text-zinc-600 text-xs mt-2">
          {lang === 'he'
            ? 'The Hebrew version is the legally binding version · גרסה עברית היא הגרסה המחייבת'
            : 'The Hebrew version is the legally binding version · גרסה עברית היא הגרסה המחייבת'
          }
        </p>
      </footer>
    </div>
  );
}

function TableOfContents({ items, lang }: { items: { id: string; title: string }[]; lang: Language }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-10">
      <h2 className="text-white font-semibold mb-4">
        {lang === 'he' ? 'תוכן עניינים' : 'Table of Contents'}
      </h2>
      <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {items.map((item, index) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-zinc-400 hover:text-amber-400 transition-colors"
            >
              {index + 1}. {item.title}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Section({
  id,
  number,
  title,
  children,
  lang
}: {
  id: string;
  number: number;
  title: string;
  children: React.ReactNode;
  lang: Language;
}) {
  return (
    <section id={id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sm:p-8 mb-6 relative overflow-hidden">
      <div className={`absolute top-0 ${lang === 'he' ? 'right-0' : 'left-0'} w-1 h-full bg-gradient-to-b from-amber-400 to-transparent opacity-50`} />
      <span className="text-xs font-medium tracking-widest uppercase text-amber-400 mb-3 block">
        {lang === 'he' ? `סעיף ${number.toString().padStart(2, '0')}` : `Section ${number.toString().padStart(2, '0')}`}
      </span>
      <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
      <div className="text-zinc-400 leading-relaxed space-y-4">
        {children}
      </div>
    </section>
  );
}

function HighlightBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-4 my-4">
      {children}
    </div>
  );
}

function EnglishContent() {
  const tocItems = [
    { id: 'en-1', title: 'General & Introduction' },
    { id: 'en-2', title: 'Definitions' },
    { id: 'en-3', title: 'Acceptance of Terms' },
    { id: 'en-4', title: 'Registration & Account' },
    { id: 'en-5', title: 'Organizer Terms' },
    { id: 'en-6', title: 'Attendee / Ticket Buyer Terms' },
    { id: 'en-7', title: 'Payments & Fees' },
    { id: 'en-8', title: 'Cancellations & Refunds' },
    { id: 'en-9', title: 'Content & Organizer Responsibility' },
    { id: 'en-10', title: 'Limitation of Liability' },
    { id: 'en-11', title: 'Prohibited Uses' },
    { id: 'en-12', title: 'Intellectual Property' },
    { id: 'en-13', title: 'Privacy' },
    { id: 'en-14', title: 'Cookies & Tracking' },
    { id: 'en-15', title: 'Third-Party Services' },
    { id: 'en-16', title: 'Data Retention & Account Deletion' },
    { id: 'en-17', title: 'Force Majeure' },
    { id: 'en-18', title: 'Dispute Resolution' },
    { id: 'en-19', title: 'Changes to Terms' },
    { id: 'en-20', title: 'Governing Law & Jurisdiction' },
    { id: 'en-21', title: 'Contact' },
  ];

  return (
    <div className="text-left">
      <TableOfContents items={tocItems} lang="en" />

      <Section id="en-1" number={1} title="General & Introduction" lang="en">
        <p>Welcome to Rendeza, accessible at <strong className="text-white">rendeza.com</strong> (the &quot;Platform&quot;). Rendeza is an event creation and ticketing platform that enables anyone to create beautiful event pages, manage registrations, and sell tickets — for free or paid events, seated or standing.</p>
        <p>The Platform is operated by <strong className="text-white">Rendeza, a sole proprietor (עוסק מורשה)</strong> registered in Israel (&quot;Rendeza&quot;, &quot;we&quot;, &quot;us&quot;). By using the Platform in any capacity, you agree to these Terms of Use in full.</p>
        <HighlightBox>
          <p><strong className="text-amber-400">Important:</strong> Rendeza is a technology platform only. Responsibility for event content, ticket conditions, cancellation policies specific to an event, and the event itself rests entirely with the event organizer — not with Rendeza.</p>
        </HighlightBox>
      </Section>

      <Section id="en-2" number={2} title="Definitions" lang="en">
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">&quot;Platform&quot;</strong> — The website rendeza.com and its associated services.</li>
          <li><strong className="text-white">&quot;Organizer&quot;</strong> — A user who creates and publishes an event through the Platform.</li>
          <li><strong className="text-white">&quot;Attendee&quot;</strong> — A user who purchases a ticket or registers for an event through the Platform.</li>
          <li><strong className="text-white">&quot;User&quot;</strong> — Any person using the Platform, including Organizers and Attendees.</li>
          <li><strong className="text-white">&quot;Event&quot;</strong> — Any activity, show, conference, party, course, workshop, or gathering published through the Platform.</li>
          <li><strong className="text-white">&quot;Ticket&quot;</strong> — Confirmation of entry to an event, whether paid or free.</li>
          <li><strong className="text-white">&quot;Service Fee&quot;</strong> — The fee charged by Rendeza for use of its services on paid events.</li>
        </ul>
      </Section>

      <Section id="en-3" number={3} title="Acceptance of Terms" lang="en">
        <p>Use of the Platform is conditional on full acceptance of these Terms. By creating an account, publishing an event, purchasing a ticket, or otherwise using the Platform, you agree to these Terms.</p>
        <p>If you do not agree to these Terms, in whole or in part, you must not use the Platform.</p>
        <p>The Platform is intended for users aged 18 or over. Use by minors requires the consent of a parent or legal guardian.</p>
      </Section>

      <Section id="en-4" number={4} title="Registration & Account" lang="en">
        <p>Some services require account creation. When registering, you must provide accurate, complete, and current information, and keep it updated. Knowingly providing false information constitutes a criminal offence under Israeli law.</p>
        <p>You are responsible for maintaining the confidentiality of your login credentials and for all activity conducted through your account. Notify us immediately of any suspected unauthorized use of your account.</p>
        <p>Rendeza reserves the right to suspend or terminate any account at any time, including in cases of breach of these Terms.</p>
      </Section>

      <Section id="en-5" number={5} title="Organizer Terms" lang="en">
        <p>By publishing an event through Rendeza, an Organizer represents and warrants that:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>They have full authority to organize the event and sell tickets to it.</li>
          <li>All published event details — date, time, location, description, price — are accurate and not misleading.</li>
          <li>They hold all licenses, permits and approvals required by law to hold the event.</li>
          <li>The event does not violate any applicable law and does not involve prohibited content.</li>
          <li>They bear full responsibility toward Attendees for the event&apos;s execution, entry conditions, and the safety and security of participants.</li>
        </ul>
        <p>In the event of a cancellation, the Organizer must notify all registered Attendees and ticket purchasers as quickly as possible and arrange for full refunds of ticket prices paid.</p>
        <HighlightBox>
          <p><strong className="text-amber-400">Content responsibility:</strong> Rendeza does not verify or vet event listings. All responsibility for the accuracy of event information and the delivery of the event rests solely with the Organizer.</p>
        </HighlightBox>
      </Section>

      <Section id="en-6" number={6} title="Attendee / Ticket Buyer Terms" lang="en">
        <p>By purchasing a ticket through Rendeza, you confirm that you have read the event details and the Organizer&apos;s cancellation policy.</p>
        <p>Tickets are personal and non-transferable unless the event&apos;s policy expressly permits otherwise. Entry is subject to the conditions set by the Organizer.</p>
        <p>Rendeza is not responsible for the content or quality of an event, its cancellation by the Organizer, or any harm suffered during the event. All such claims must be directed to the event Organizer.</p>
      </Section>

      <Section id="en-7" number={7} title="Payments & Fees" lang="en">
        <p>Free events — the Platform is free to use.</p>
        <p>Paid events — Rendeza charges a service fee, disclosed at the time of event creation. The Organizer may choose to pass this fee on to buyers or absorb it themselves.</p>
        <p>Payments are processed through a third-party payment processor. Rendeza does not store credit card details. All payment transfers are secured with SSL encryption.</p>
        <p>Organizer payouts will be made according to the schedule agreed with the Organizer, net of Rendeza&apos;s service fee. Rendeza reserves the right to withhold or delay payment in cases of disputes, cancellations, or suspected fraud.</p>
      </Section>

      <Section id="en-8" number={8} title="Cancellations & Refunds" lang="en">
        <p><strong className="text-white">Cancellation by the Buyer —</strong> In accordance with the Israeli Consumer Protection Law, 5741–1981, and the Consumer Protection Regulations (Transaction Cancellation), 5771–2010:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>A ticket purchase may be cancelled within <strong className="text-white">14 days</strong> of purchase, provided the cancellation is made no later than <strong className="text-white">7 business days</strong> before the event.</li>
          <li>Upon such cancellation, a full refund will be issued, less a cancellation fee of up to 5% of the transaction value or ₪100 — whichever is lower.</li>
          <li>After the statutory cancellation period has elapsed, cancellations are subject to the cancellation policy set by the Organizer.</li>
        </ul>
        <p><strong className="text-white">Event cancellation by the Organizer —</strong> If an Organizer cancels an event, Attendees are entitled to a full refund of the ticket price. Rendeza&apos;s service fee is non-refundable unless otherwise stated.</p>
        <p>All cancellation requests must be submitted in writing to: <strong className="text-white">hello@rendeza.com</strong></p>
      </Section>

      <Section id="en-9" number={9} title="Content & Organizer Responsibility" lang="en">
        <p>Rendeza is not the seller of tickets and is not the producer of events. We provide the technology platform for publishing events and processing ticket sales. All content published on the Platform — including event descriptions, images, logos and any other material — is the sole responsibility of the Organizer.</p>
        <p>Rendeza reserves the right to remove any content that violates these Terms, at its sole discretion and without prior notice.</p>
      </Section>

      <Section id="en-10" number={10} title="Limitation of Liability" lang="en">
        <p>Rendeza shall not be liable for any direct, indirect, incidental or consequential loss or damage arising from:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>Cancellation, alteration, postponement or non-delivery of an event by the Organizer.</li>
          <li>Event content that does not match the published description.</li>
          <li>Damage, injury or loss suffered by an Attendee during an event.</li>
          <li>Temporary unavailability of the Platform, including due to technical faults.</li>
          <li>Payment details provided by the User.</li>
          <li>Unauthorized use of a User&apos;s account.</li>
        </ul>
        <p>To the extent that Rendeza&apos;s liability cannot be entirely excluded by law, it shall be limited to the amount paid by the User to Rendeza in connection with the specific transaction giving rise to the claim.</p>
      </Section>

      <Section id="en-11" number={11} title="Prohibited Uses" lang="en">
        <p>The following uses of the Platform are strictly prohibited:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>Publishing fictitious or misleading events.</li>
          <li>Selling tickets for events that will not take place as described.</li>
          <li>Distributing hate speech, racist, violent, obscene or otherwise unlawful content.</li>
          <li>Violating others&apos; privacy, including collecting data without consent.</li>
          <li>Attempting to penetrate Platform systems, disrupt its operation, or use counterfeit tickets.</li>
          <li>Ticket scalping (resale) without the explicit approval of the Organizer.</li>
          <li>Any use designed to circumvent Platform fees.</li>
          <li>Commercial use of the Platform without Rendeza&apos;s prior written consent.</li>
        </ul>
      </Section>

      <Section id="en-12" number={12} title="Intellectual Property" lang="en">
        <p>All rights in the Platform itself — including design, code, logos and content created by Rendeza — belong exclusively to Rendeza.</p>
        <p>By uploading content to the Platform (images, descriptions, logos), the Organizer grants Rendeza a non-exclusive, royalty-free license to display the content and promote the event on the Platform and its associated channels.</p>
        <p>The Organizer warrants that they hold all rights in the content uploaded, and that uploading it does not infringe any third-party rights.</p>
      </Section>

      <Section id="en-13" number={13} title="Privacy" lang="en">
        <p>The collection and use of personal data is governed by Rendeza&apos;s Privacy Policy, which forms an integral part of these Terms.</p>
        <p>Rendeza operates in accordance with the Israeli Protection of Privacy Law, 5741–1981, and its associated regulations.</p>
        <p>Organizers who use Attendee data collected through the Platform must use such data solely for event management purposes and in accordance with applicable privacy law.</p>
      </Section>

      <Section id="en-14" number={14} title="Cookies & Tracking" lang="en">
        <p>The Platform uses cookies and similar tracking technologies to enhance your experience, analyze usage patterns, and provide personalized content.</p>
        <p><strong className="text-white">Types of cookies we use:</strong></p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">Essential cookies</strong> — Required for the Platform to function properly, including authentication and security.</li>
          <li><strong className="text-white">Analytics cookies</strong> — Help us understand how visitors interact with the Platform to improve our services.</li>
          <li><strong className="text-white">Preference cookies</strong> — Remember your settings and preferences (such as language selection).</li>
        </ul>
        <p>By using the Platform, you consent to the use of cookies as described. You can manage cookie preferences through your browser settings, though disabling certain cookies may affect Platform functionality.</p>
      </Section>

      <Section id="en-15" number={15} title="Third-Party Services" lang="en">
        <p>The Platform integrates with third-party services to provide certain functionality. These services include:</p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">Payment processing</strong> — We use third-party payment processors to handle transactions securely. Your payment information is processed directly by these providers and is subject to their respective privacy policies and terms.</li>
          <li><strong className="text-white">Analytics services</strong> — We use analytics providers to understand Platform usage and improve our services.</li>
          <li><strong className="text-white">Authentication services</strong> — We may offer sign-in through third-party providers (such as Google).</li>
          <li><strong className="text-white">Cloud infrastructure</strong> — The Platform is hosted on third-party cloud services.</li>
        </ul>
        <p>Rendeza is not responsible for the practices of third-party service providers. We encourage you to review their respective terms and privacy policies.</p>
      </Section>

      <Section id="en-16" number={16} title="Data Retention & Account Deletion" lang="en">
        <p><strong className="text-white">Data Retention —</strong> We retain your personal data for as long as your account is active or as needed to provide services. After account deletion, we may retain certain data for a reasonable period to comply with legal obligations, resolve disputes, and enforce our agreements.</p>
        <p><strong className="text-white">Account Deletion —</strong> You may request deletion of your account at any time by contacting us at <strong className="text-white">hello@rendeza.com</strong>. Upon receiving a valid deletion request:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>Your account will be deactivated and personal data will be deleted or anonymized within 30 days.</li>
          <li>Certain information may be retained where required by law or for legitimate business purposes (such as transaction records for tax and accounting purposes).</li>
          <li>Content you posted on public event pages may remain visible but will be disassociated from your identity.</li>
        </ul>
        <p>Organizers should note that deleting their account will not automatically cancel or delete published events. Events must be cancelled or transferred before account deletion.</p>
      </Section>

      <Section id="en-17" number={17} title="Force Majeure" lang="en">
        <p>Rendeza shall not be liable for any failure or delay in performing its obligations under these Terms if such failure or delay results from circumstances beyond its reasonable control, including but not limited to:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>Natural disasters, acts of God, or extreme weather events</li>
          <li>War, terrorism, civil unrest, or armed conflict</li>
          <li>Epidemics, pandemics, or public health emergencies</li>
          <li>Government actions, laws, regulations, or restrictions</li>
          <li>Power outages, telecommunications failures, or internet disruptions</li>
          <li>Cyberattacks, hacking, or other malicious activities beyond our control</li>
          <li>Strikes, labor disputes, or other industrial actions</li>
        </ul>
        <p>In such events, Rendeza&apos;s obligations will be suspended for the duration of the force majeure event. We will make reasonable efforts to resume normal operations as soon as practicable.</p>
      </Section>

      <Section id="en-18" number={18} title="Dispute Resolution" lang="en">
        <p><strong className="text-white">Informal Resolution —</strong> Before initiating any formal legal proceedings, you agree to first contact us at <strong className="text-white">hello@rendeza.com</strong> to attempt to resolve the dispute informally. We will make good-faith efforts to resolve any dispute within 30 days of receiving your notice.</p>
        <p><strong className="text-white">Mediation —</strong> If informal resolution is unsuccessful, either party may propose mediation through a mutually agreed-upon mediator. The costs of mediation shall be shared equally between the parties.</p>
        <p><strong className="text-white">Legal Proceedings —</strong> If the dispute cannot be resolved through informal resolution or mediation, either party may pursue legal action in accordance with the Governing Law & Jurisdiction section of these Terms.</p>
        <p><strong className="text-white">Exceptions —</strong> Nothing in this section prevents either party from seeking injunctive or other equitable relief from a court to prevent imminent harm or protect intellectual property rights.</p>
      </Section>

      <Section id="en-19" number={19} title="Changes to Terms" lang="en">
        <p>Rendeza reserves the right to amend these Terms at any time, at its sole discretion. Material changes will be published on the Platform and will take effect 14 days after publication.</p>
        <p>Continued use of the Platform after changes take effect constitutes acceptance of the updated Terms.</p>
      </Section>

      <Section id="en-20" number={20} title="Governing Law & Jurisdiction" lang="en">
        <p>These Terms are governed by the laws of the State of Israel. Any dispute arising from these Terms shall be brought before the competent courts in Israel.</p>
        <p>If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.</p>
      </Section>

      <Section id="en-21" number={21} title="Contact" lang="en">
        <p>For any questions, requests, or cancellation enquiries, please contact us:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>Email: <strong className="text-white">hello@rendeza.com</strong></li>
          <li>Website: <strong className="text-white">rendeza.com</strong></li>
        </ul>
        <p>We aim to respond to all enquiries within 3 business days.</p>
      </Section>
    </div>
  );
}

function HebrewContent() {
  const tocItems = [
    { id: 'he-1', title: 'כללי ומבוא' },
    { id: 'he-2', title: 'הגדרות' },
    { id: 'he-3', title: 'קבלת תנאי השימוש' },
    { id: 'he-4', title: 'רישום וחשבון משתמש' },
    { id: 'he-5', title: 'תנאים למארגני אירועים' },
    { id: 'he-6', title: 'תנאים לרוכשי כרטיסים' },
    { id: 'he-7', title: 'תשלומים ועמלות' },
    { id: 'he-8', title: 'ביטולים והחזרים' },
    { id: 'he-9', title: 'תכנים ואחריות' },
    { id: 'he-10', title: 'הגבלת אחריות' },
    { id: 'he-11', title: 'שימושים אסורים' },
    { id: 'he-12', title: 'קניין רוחני' },
    { id: 'he-13', title: 'פרטיות' },
    { id: 'he-14', title: 'עוגיות ומעקב' },
    { id: 'he-15', title: 'שירותי צד שלישי' },
    { id: 'he-16', title: 'שמירת מידע ומחיקת חשבון' },
    { id: 'he-17', title: 'כוח עליון' },
    { id: 'he-18', title: 'יישוב סכסוכים' },
    { id: 'he-19', title: 'שינויים בתנאים' },
    { id: 'he-20', title: 'דין חל וסמכות שיפוט' },
    { id: 'he-21', title: 'יצירת קשר' },
  ];

  return (
    <div className="text-right" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <TableOfContents items={tocItems} lang="he" />

      <Section id="he-1" number={1} title="כללי ומבוא" lang="he">
        <p>ברוכים הבאים לפלטפורמת Rendeza, הפועלת בכתובת <strong className="text-white">rendeza.com</strong> (&quot;הפלטפורמה&quot; או &quot;האתר&quot;). Rendeza היא פלטפורמה ליצירת עמודי אירועים, ניהול הרשמות ומכירת כרטיסים לאירועים מכל סוג — אירועים בתשלום ואירועים חינמיים, אירועים עם ישיבה ואירועים עומדים.</p>
        <p>הפלטפורמה מנוהלת ומופעלת על ידי <strong className="text-white">Rendeza, עוסק מורשה</strong> (&quot;Rendeza&quot;, &quot;אנחנו&quot; או &quot;הפלטפורמה&quot;). המשך השימוש בפלטפורמה מהווה הסכמה מלאה לכל האמור בתנאי שימוש אלה.</p>
        <HighlightBox>
          <p><strong className="text-amber-400">חשוב לדעת:</strong> Rendeza היא פלטפורמה טכנולוגית בלבד. האחריות על תוכן האירוע, כרטיסים שנמכרו, תנאי ביטול ספציפיים לאירוע וקיום האירוע עצמו מוטלת במלואה על מארגן האירוע ולא על Rendeza.</p>
        </HighlightBox>
      </Section>

      <Section id="he-2" number={2} title="הגדרות" lang="he">
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">&quot;פלטפורמה&quot;</strong> — אתר rendeza.com ושירותיו הנלווים.</li>
          <li><strong className="text-white">&quot;מארגן&quot;</strong> — משתמש הרושם אירוע ומפרסם אותו דרך הפלטפורמה.</li>
          <li><strong className="text-white">&quot;משתתף&quot;</strong> — משתמש הרוכש כרטיס או נרשם לאירוע דרך הפלטפורמה.</li>
          <li><strong className="text-white">&quot;משתמש&quot;</strong> — כל אדם המשתמש בפלטפורמה, לרבות מארגן ומשתתף.</li>
          <li><strong className="text-white">&quot;אירוע&quot;</strong> — כל פעילות, מופע, כנס, מסיבה, קורס, סדנה או כל התכנסות אחרת המפורסמת דרך הפלטפורמה.</li>
          <li><strong className="text-white">&quot;כרטיס&quot;</strong> — אישור כניסה לאירוע, בין אם בתשלום ובין אם חינם.</li>
          <li><strong className="text-white">&quot;עמלת שירות&quot;</strong> — העמלה שגובה Rendeza בגין שימוש בשירותיה.</li>
        </ul>
      </Section>

      <Section id="he-3" number={3} title="קבלת תנאי השימוש" lang="he">
        <p>השימוש בפלטפורמה מותנה בקבלה מלאה של תנאי שימוש אלה. על ידי יצירת חשבון, פרסום אירוע, רכישת כרטיס או כל שימוש אחר בפלטפורמה, הנך מסכים לתנאים אלה.</p>
        <p>אם אינך מסכים לתנאים אלה, כולם או חלקם, הנך מתבקש שלא לעשות שימוש בפלטפורמה.</p>
        <p>השימוש בפלטפורמה מותר למי שמלאו לו 18 שנה. שימוש על ידי קטינים מוגבל לקבלת הסכמת הורה או אפוטרופוס חוקי.</p>
      </Section>

      <Section id="he-4" number={4} title="רישום וחשבון משתמש" lang="he">
        <p>חלק מהשירותים מחייבים פתיחת חשבון. בעת הרישום על המשתמש למסור פרטים נכונים, מדויקים ומלאים, ולעדכנם בכל שינוי. מסירת פרטים כוזבים ביודעין מהווה עבירה פלילית.</p>
        <p>המשתמש אחראי לשמירה על סודיות פרטי הגישה לחשבון (שם משתמש וסיסמה) ולכל פעולה שתתבצע באמצעות חשבונו. יש להודיע לנו מיידית על כל חשד לשימוש לא מורשה בחשבון.</p>
        <p>Rendeza שומרת לעצמה את הזכות לבטל חשבון משתמש בכל עת, מכל סיבה, ובפרט במקרים של הפרת תנאי שימוש אלה.</p>
      </Section>

      <Section id="he-5" number={5} title="תנאים למארגני אירועים" lang="he">
        <p>מארגן המפרסם אירוע דרך Rendeza מצהיר ומתחייב כי:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>הוא מוסמך וזכאי לארגן ולמכור כרטיסים לאירוע האמור.</li>
          <li>כל המידע המפורסם על האירוע — תאריך, שעה, מיקום, תיאור, מחיר — נכון ומדויק.</li>
          <li>ברשותו כל האישורים, הרישיונות וההיתרים הדרושים על פי דין לקיום האירוע.</li>
          <li>האירוע אינו מפר חוק כלשהו ואינו עוסק בתכנים אסורים.</li>
          <li>הוא נושא באחריות מלאה כלפי המשתתפים בכל הנוגע לקיום האירוע, תנאי הכניסה, ביטחון ובטיחות המשתתפים.</li>
        </ul>
        <p>בעת ביטול אירוע, על המארגן להודיע לכל הרשומים/רוכשי הכרטיסים בהקדם האפשרי ולפעול להחזר מלא של הסכום ששולם בגין הכרטיסים.</p>
        <HighlightBox>
          <p><strong className="text-amber-400">אחריות תוכן:</strong> Rendeza אינה בודקת או מאמתת את פרטי האירועים המפורסמים בפלטפורמה. כל אחריות לתוכן, דיוק המידע וקיום האירוע מוטלת על המארגן בלבד.</p>
        </HighlightBox>
      </Section>

      <Section id="he-6" number={6} title="תנאים לרוכשי כרטיסים ומשתתפים" lang="he">
        <p>רוכש כרטיס דרך Rendeza מאשר כי קרא את פרטי האירוע, מדיניות הביטול של המארגן ותנאי ההשתתפות.</p>
        <p>הכרטיס הוא אישי ואינו ניתן להעברה אלא אם מדיניות האירוע מאפשרת זאת במפורש. שימוש בכרטיס כפוף לכללי הכניסה שנקבעו על ידי מארגן האירוע.</p>
        <p>Rendeza אינה אחראית על תוכן האירוע, רמת הביצוע, ביטול האירוע על ידי המארגן, או כל נזק שנגרם למשתתף במהלך האירוע. כל טענה בנושאים אלו תופנה ישירות למארגן האירוע.</p>
      </Section>

      <Section id="he-7" number={7} title="תשלומים ועמלות" lang="he">
        <p>לאירועים חינמיים — השימוש בפלטפורמה חינמי.</p>
        <p>לאירועים בתשלום — Rendeza גובה עמלת שירות שתפורסם בעת יצירת האירוע. העמלה יכולה להיות מגולגלת על הרוכש (Absorb by buyer) או ספוגה על ידי המארגן, לפי בחירת המארגן.</p>
        <p>התשלום מתבצע באמצעות שירות עיבוד תשלומים חיצוני. Rendeza אינה שומרת פרטי כרטיס אשראי. כל העברות הכסף מאובטחות באמצעות הצפנת SSL.</p>
        <p>תשלום לאחר מארגן האירוע יבוצע בהתאם ללוח הזמנים שסוכם עם המארגן, בניכוי עמלת Rendeza. Rendeza שומרת לעצמה את הזכות לעכב העברת תשלום במקרה של מחלוקות, ביטולים או חשד לפעילות הונאה.</p>
      </Section>

      <Section id="he-8" number={8} title="ביטולים והחזרים" lang="he">
        <p><strong className="text-white">ביטול עסקה על ידי הרוכש —</strong> בהתאם לחוק הגנת הצרכן, התשמ&quot;א–1981 ותקנות הגנת הצרכן (ביטול עסקה), התשע&quot;א–2010:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>ניתן לבטל עסקת רכישת כרטיס תוך <strong className="text-white">14 יום</strong> ממועד הרכישה, ובתנאי שהביטול ייעשה לא יאוחר מ-<strong className="text-white">7 ימי עסקים</strong> לפני מועד האירוע.</li>
          <li>במקרה של ביטול כאמור, תבוצע החזרה מלאה, בניכוי דמי ביטול של עד 5% ממחיר העסקה או 100 ₪ — הנמוך מביניהם.</li>
          <li>לאחר תום תקופת הביטול החוקית, ביטול הכרטיס כפוף למדיניות הביטול שנקבעה על ידי מארגן האירוע.</li>
        </ul>
        <p><strong className="text-white">ביטול אירוע על ידי המארגן —</strong> במקרה שמארגן מבטל אירוע, המשתתפים זכאים להחזר מלא של מחיר הכרטיס. עמלת השירות של Rendeza אינה מוחזרת אלא אם נקבע אחרת.</p>
        <p>בקשות ביטול יש להגיש בכתב לכתובת המייל: <strong className="text-white">hello@rendeza.com</strong></p>
      </Section>

      <Section id="he-9" number={9} title="תכנים ואחריות מארגנים" lang="he">
        <p>Rendeza אינה המוכרת של הכרטיסים ואינה ה&quot;מפיקה&quot; של האירועים. אנו מספקים את הפלטפורמה הטכנולוגית לפרסום ומכירת כרטיסים. כל המידע המפורסם על האירוע — לרבות תיאורי אירועים, תמונות, לוגואים וכל תוכן אחר — הינו באחריות בלעדית של המארגן.</p>
        <p>Rendeza שומרת לעצמה את הזכות להסיר כל תוכן המפר את תנאי השימוש, על פי שיקול דעתה הבלעדי וללא הודעה מוקדמת.</p>
      </Section>

      <Section id="he-10" number={10} title="הגבלת אחריות" lang="he">
        <p>Rendeza לא תישא באחריות לכל נזק ישיר, עקיף, מקרי או תוצאתי הנובע מ:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>ביטול, שינוי, דחיית מועד, או אי-קיום אירוע על ידי המארגן.</li>
          <li>תוכן אירוע שאינו תואם את התיאור שפורסם על ידי המארגן.</li>
          <li>נזק, פציעה או אובדן שנגרמו למשתתף במהלך האירוע.</li>
          <li>אי-זמינות זמנית של הפלטפורמה (downtime), לרבות כתוצאה מתקלות טכניות.</li>
          <li>פרטי התשלום שסיפק המשתמש.</li>
          <li>שימוש בלתי מורשה בחשבון המשתמש.</li>
        </ul>
        <p>ככל שחבות Rendeza לא ניתנת לשלילה לחלוטין על פי דין, היא תוגבל לסכום ששולם על ידי המשתמש ל-Rendeza בגין עסקה הספציפית שביחס אליה נטענת החבות.</p>
      </Section>

      <Section id="he-11" number={11} title="שימושים אסורים" lang="he">
        <p>חל איסור מוחלט לעשות שימוש בפלטפורמה לצורך:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>פרסום אירועים פיקטיביים או מטעים.</li>
          <li>מכירת כרטיסים לאירועים שאינם מתקיימים כמפורסם.</li>
          <li>הפצת תכנים שנאה, גזענות, אלימות, תועבה, או כל תוכן בלתי חוקי.</li>
          <li>פגיעה בפרטיות של אחרים, לרבות איסוף נתונים ללא הסכמה.</li>
          <li>ניסיון לחדור למערכות הפלטפורמה, להפריע לפעילותה, או לעשות שימוש בכרטיסים מזויפים.</li>
          <li>מכירה חוזרת של כרטיסים (scalping) ללא אישור מפורש של המארגן.</li>
          <li>כל שימוש שנועד לעקוף את עמלות הפלטפורמה.</li>
          <li>שימוש מסחרי בפלטפורמה ללא הסכמת Rendeza בכתב.</li>
        </ul>
      </Section>

      <Section id="he-12" number={12} title="קניין רוחני" lang="he">
        <p>כל הזכויות בפלטפורמה עצמה — לרבות עיצוב, קוד, לוגו ותוכן שנוצר על ידי Rendeza — שייכות ל-Rendeza בלבד.</p>
        <p>בעת פרסום תוכן בפלטפורמה (תמונות, תיאורים, לוגואים), המארגן מעניק ל-Rendeza רישיון שימוש לא-בלעדי, ללא תמלוגים, לצורך הצגת התוכן ושיווק האירוע בפלטפורמה ובערוצים הנלווים לה.</p>
        <p>המארגן מצהיר כי הוא בעל הזכויות בתוכן שהעלה, ושהעלאתו אינה מפרה זכויות של צד שלישי.</p>
      </Section>

      <Section id="he-13" number={13} title="פרטיות" lang="he">
        <p>איסוף ושימוש בנתונים אישיים כפופים למדיניות הפרטיות של Rendeza, המהווה חלק בלתי נפרד מתנאי שימוש אלה.</p>
        <p>Rendeza פועלת בהתאם לחוק הגנת הפרטיות, התשמ&quot;א–1981, ולתקנות שהותקנו מכוחו.</p>
        <p>מארגנים המשתמשים בנתוני המשתתפים שנאספו דרך הפלטפורמה, מחויבים לעשות שימוש בנתונים אלה אך ורק למטרת ניהול האירוע, ובהתאם לדיני הגנת הפרטיות.</p>
      </Section>

      <Section id="he-14" number={14} title="עוגיות ומעקב" lang="he">
        <p>הפלטפורמה משתמשת בעוגיות (cookies) וטכנולוגיות מעקב דומות לשיפור חווית המשתמש, ניתוח דפוסי שימוש והצגת תוכן מותאם אישית.</p>
        <p><strong className="text-white">סוגי העוגיות בהן אנו משתמשים:</strong></p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">עוגיות חיוניות</strong> — נדרשות לתפקוד תקין של הפלטפורמה, כולל אימות וביטחון.</li>
          <li><strong className="text-white">עוגיות אנליטיות</strong> — מסייעות לנו להבין כיצד מבקרים משתמשים בפלטפורמה לשיפור השירותים.</li>
          <li><strong className="text-white">עוגיות העדפות</strong> — זוכרות את ההגדרות וההעדפות שלך (כגון בחירת שפה).</li>
        </ul>
        <p>השימוש בפלטפורמה מהווה הסכמה לשימוש בעוגיות כמתואר. ניתן לנהל העדפות עוגיות דרך הגדרות הדפדפן, אם כי השבתת עוגיות מסוימות עשויה להשפיע על פונקציונליות הפלטפורמה.</p>
      </Section>

      <Section id="he-15" number={15} title="שירותי צד שלישי" lang="he">
        <p>הפלטפורמה משתלבת עם שירותי צד שלישי לצורך מתן פונקציונליות מסוימת. שירותים אלה כוללים:</p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">עיבוד תשלומים</strong> — אנו משתמשים בספקי עיבוד תשלומים חיצוניים לטיפול בעסקאות באופן מאובטח. פרטי התשלום שלך מעובדים ישירות על ידי ספקים אלה וכפופים למדיניות הפרטיות והתנאים שלהם.</li>
          <li><strong className="text-white">שירותי אנליטיקה</strong> — אנו משתמשים בספקי אנליטיקה להבנת השימוש בפלטפורמה ושיפור השירותים.</li>
          <li><strong className="text-white">שירותי אימות</strong> — אנו עשויים להציע התחברות באמצעות ספקים חיצוניים (כגון Google).</li>
          <li><strong className="text-white">תשתית ענן</strong> — הפלטפורמה מאוחסנת על שירותי ענן של צד שלישי.</li>
        </ul>
        <p>Rendeza אינה אחראית לפרקטיקות של ספקי שירותים חיצוניים. אנו ממליצים לעיין בתנאים ובמדיניות הפרטיות שלהם.</p>
      </Section>

      <Section id="he-16" number={16} title="שמירת מידע ומחיקת חשבון" lang="he">
        <p><strong className="text-white">שמירת מידע —</strong> אנו שומרים את המידע האישי שלך כל עוד חשבונך פעיל או לפי הצורך למתן שירותים. לאחר מחיקת חשבון, אנו עשויים לשמור מידע מסוים לתקופה סבירה לצורך עמידה בחובות חוקיות, יישוב מחלוקות ואכיפת ההסכמים שלנו.</p>
        <p><strong className="text-white">מחיקת חשבון —</strong> ניתן לבקש מחיקת חשבון בכל עת על ידי פנייה אלינו ב-<strong className="text-white">hello@rendeza.com</strong>. עם קבלת בקשת מחיקה תקפה:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>חשבונך יושבת והמידע האישי יימחק או יאונימיזציה תוך 30 יום.</li>
          <li>מידע מסוים עשוי להישמר כאשר נדרש על פי חוק או למטרות עסקיות לגיטימיות (כגון רשומות עסקאות לצרכי מס וחשבונאות).</li>
          <li>תוכן שפרסמת בעמודי אירועים ציבוריים עשוי להישאר גלוי אך ינותק מזהותך.</li>
        </ul>
        <p>מארגנים צריכים לדעת כי מחיקת חשבונם לא תבטל או תמחק אוטומטית אירועים שפורסמו. יש לבטל או להעביר אירועים לפני מחיקת החשבון.</p>
      </Section>

      <Section id="he-17" number={17} title="כוח עליון" lang="he">
        <p>Rendeza לא תהיה אחראית לכל כשל או עיכוב בביצוע התחייבויותיה על פי תנאים אלה אם כשל או עיכוב כאמור נובע מנסיבות שאינן בשליטתה הסבירה, לרבות אך לא רק:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>אסונות טבע, מעשי אלוהים, או אירועי מזג אוויר קיצוניים</li>
          <li>מלחמה, טרור, מהומות אזרחיות, או סכסוך מזוין</li>
          <li>מגפות, פנדמיות, או מצבי חירום בריאותיים</li>
          <li>פעולות ממשלתיות, חוקים, תקנות או הגבלות</li>
          <li>הפסקות חשמל, כשלי תקשורת, או הפרעות באינטרנט</li>
          <li>מתקפות סייבר, פריצות, או פעילויות זדוניות אחרות שאינן בשליטתנו</li>
          <li>שביתות, סכסוכי עבודה, או פעולות תעשייתיות אחרות</li>
        </ul>
        <p>באירועים כאלה, התחייבויות Rendeza יושעו למשך אירוע הכוח העליון. נעשה מאמצים סבירים לחדש את הפעילות הרגילה בהקדם האפשרי.</p>
      </Section>

      <Section id="he-18" number={18} title="יישוב סכסוכים" lang="he">
        <p><strong className="text-white">פתרון בלתי פורמלי —</strong> לפני פתיחת הליכים משפטיים פורמליים, הנך מסכים לפנות אלינו תחילה ב-<strong className="text-white">hello@rendeza.com</strong> בניסיון ליישב את הסכסוך באופן בלתי פורמלי. נעשה מאמצים בתום לב ליישב כל סכסוך תוך 30 יום מקבלת הודעתך.</p>
        <p><strong className="text-white">גישור —</strong> אם הפתרון הבלתי פורמלי לא יצליח, כל צד רשאי להציע גישור באמצעות מגשר שיוסכם הדדית. עלויות הגישור יחולקו שווה בשווה בין הצדדים.</p>
        <p><strong className="text-white">הליכים משפטיים —</strong> אם לא ניתן ליישב את הסכסוך באמצעות פתרון בלתי פורמלי או גישור, כל צד רשאי לנקוט בהליכים משפטיים בהתאם לסעיף הדין החל וסמכות השיפוט בתנאים אלה.</p>
        <p><strong className="text-white">חריגים —</strong> אין בסעיף זה כדי למנוע מכל צד לבקש צו מניעה או סעד שוויוני אחר מבית משפט למניעת נזק מיידי או להגנה על זכויות קניין רוחני.</p>
      </Section>

      <Section id="he-19" number={19} title="שינויים בתנאים" lang="he">
        <p>Rendeza שומרת לעצמה את הזכות לשנות תנאי שימוש אלה בכל עת, על פי שיקול דעתה הבלעדי. שינויים מהותיים יפורסמו באתר ויכנסו לתוקף 14 יום לאחר פרסומם.</p>
        <p>המשך השימוש בפלטפורמה לאחר כניסת השינויים לתוקף מהווה הסכמה לתנאים המעודכנים.</p>
      </Section>

      <Section id="he-20" number={20} title="דין חל וסמכות שיפוט" lang="he">
        <p>תנאי שימוש אלה כפופים לדין הישראלי. כל מחלוקת הנובעת מתנאים אלה תובא לפתרון בפני בתי המשפט המוסמכים בישראל.</p>
        <p>פסלות הוראה מסוימת בתנאים אלה לא תפגע בתוקף יתר ההוראות.</p>
      </Section>

      <Section id="he-21" number={21} title="יצירת קשר" lang="he">
        <p>לכל שאלה, פנייה או בקשת ביטול ניתן לפנות אלינו:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>דוא&quot;ל: <strong className="text-white">hello@rendeza.com</strong></li>
          <li>אתר: <strong className="text-white">rendeza.com</strong></li>
        </ul>
        <p>אנו נשתדל להשיב לכל פנייה תוך 3 ימי עסקים.</p>
      </Section>
    </div>
  );
}
