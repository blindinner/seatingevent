'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Language = 'he' | 'en';

export default function PrivacyPage() {
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
              <>מדיניות <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">פרטיות</span></>
            ) : (
              <>Privacy <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Policy</span></>
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
        <div className="flex justify-center gap-4 mb-4">
          <Link href="/terms" className="text-amber-400 hover:underline text-sm">
            {lang === 'he' ? 'תנאי שימוש' : 'Terms of Use'}
          </Link>
          <span className="text-zinc-600">·</span>
          <Link href="/privacy" className="text-zinc-400 text-sm">
            {lang === 'he' ? 'מדיניות פרטיות' : 'Privacy Policy'}
          </Link>
        </div>
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
    { id: 'en-1', title: 'Introduction' },
    { id: 'en-2', title: 'Information We Collect' },
    { id: 'en-3', title: 'How We Use Your Information' },
    { id: 'en-4', title: 'Sharing Your Information' },
    { id: 'en-5', title: 'Data Security' },
    { id: 'en-6', title: 'Cookies & Tracking' },
    { id: 'en-7', title: 'Your Rights' },
    { id: 'en-8', title: 'Data Retention' },
    { id: 'en-9', title: 'Third-Party Services' },
    { id: 'en-10', title: 'International Transfers' },
    { id: 'en-11', title: 'Children\'s Privacy' },
    { id: 'en-12', title: 'Changes to This Policy' },
    { id: 'en-13', title: 'Contact Us' },
  ];

  return (
    <div className="text-left">
      <TableOfContents items={tocItems} lang="en" />

      <Section id="en-1" number={1} title="Introduction" lang="en">
        <p>This Privacy Policy applies to the website <strong className="text-white">rendeza.com</strong> (the &quot;Platform&quot;) operated by <strong className="text-white">Rendeza</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).</p>
        <p>We respect your right to privacy. This Privacy Policy explains how we collect, use, and protect information received from users. If you have any questions about this Privacy Policy, please contact us at: <strong className="text-white">hello@rendeza.com</strong></p>
        <p>Please also review our <Link href="/terms" className="text-amber-400 hover:underline">Terms of Use</Link>. By using the Platform, you consent to the terms outlined in this Privacy Policy.</p>
        <HighlightBox>
          <p><strong className="text-amber-400">Important:</strong> &quot;Personal Information&quot; as used in this Privacy Policy means data relating to an identified or identifiable person, including name, phone number, address, date of birth, or email address.</p>
        </HighlightBox>
      </Section>

      <Section id="en-2" number={2} title="Information We Collect" lang="en">
        <p><strong className="text-white">Information you provide:</strong></p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">Account information:</strong> Name, email address, phone number, and password when you register.</li>
          <li><strong className="text-white">Profile information:</strong> Profile picture and preferences you choose to provide.</li>
          <li><strong className="text-white">Transaction information:</strong> Payment details (processed by third-party providers), ticket purchases, and order history.</li>
          <li><strong className="text-white">Event information:</strong> Details of events you attend or organize.</li>
          <li><strong className="text-white">Communications:</strong> Messages you send us or through the Platform.</li>
        </ul>

        <p className="mt-4"><strong className="text-white">Information collected automatically:</strong></p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">Device information:</strong> IP address, browser type, operating system, device identifiers.</li>
          <li><strong className="text-white">Usage information:</strong> Pages viewed, features used, time spent on the Platform.</li>
          <li><strong className="text-white">Location information:</strong> General location based on IP address.</li>
          <li><strong className="text-white">Cookies:</strong> As described in the Cookies section below.</li>
        </ul>

        <p className="mt-4"><strong className="text-white">Information from organizers:</strong></p>
        <p>For event organizers, we may collect additional business information including business name, tax ID, bank account details for payouts, and identification documents as required by law.</p>
      </Section>

      <Section id="en-3" number={3} title="How We Use Your Information" lang="en">
        <p>We use your information for the following purposes:</p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">Provide services:</strong> Process ticket purchases, manage registrations, and deliver event information.</li>
          <li><strong className="text-white">Communicate:</strong> Send confirmations, updates, and respond to inquiries.</li>
          <li><strong className="text-white">Improve our Platform:</strong> Analyze usage, develop new features, and enhance user experience.</li>
          <li><strong className="text-white">Security:</strong> Detect and prevent fraud, unauthorized access, and other illegal activities.</li>
          <li><strong className="text-white">Legal compliance:</strong> Comply with applicable laws and regulations.</li>
          <li><strong className="text-white">Marketing:</strong> With your consent, send promotional communications about events and services.</li>
        </ul>
      </Section>

      <Section id="en-4" number={4} title="Sharing Your Information" lang="en">
        <p>We may share your information in the following circumstances:</p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">Event organizers:</strong> When you purchase tickets, we share necessary information with the event organizer (name, email, ticket details).</li>
          <li><strong className="text-white">Service providers:</strong> Third-party companies that help us operate our Platform (payment processors, email services, hosting providers).</li>
          <li><strong className="text-white">Legal requirements:</strong> When required by law, court order, or to protect our rights and safety.</li>
          <li><strong className="text-white">Business transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
        </ul>
        <HighlightBox>
          <p><strong className="text-amber-400">Note:</strong> We do not sell your personal information to third parties for their marketing purposes.</p>
        </HighlightBox>
      </Section>

      <Section id="en-5" number={5} title="Data Security" lang="en">
        <p>We implement industry-standard security measures to protect your information:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>SSL/TLS encryption for data transmission</li>
          <li>Secure storage with access controls</li>
          <li>Regular security assessments</li>
          <li>Payment processing through PCI-DSS compliant providers</li>
        </ul>
        <p className="mt-4">We do not store credit card details in our systems. Payment information is processed directly by our secure payment partners.</p>
        <p>While we strive to protect your information, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.</p>
      </Section>

      <Section id="en-6" number={6} title="Cookies & Tracking" lang="en">
        <p>We use cookies and similar technologies to enhance your experience:</p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">Essential cookies:</strong> Required for the Platform to function properly.</li>
          <li><strong className="text-white">Analytics cookies:</strong> Help us understand how visitors use the Platform.</li>
          <li><strong className="text-white">Preference cookies:</strong> Remember your settings and preferences.</li>
          <li><strong className="text-white">Marketing cookies:</strong> Used to deliver relevant advertisements (with your consent).</li>
        </ul>
        <p className="mt-4">You can manage cookie preferences through your browser settings. Disabling certain cookies may affect Platform functionality.</p>
      </Section>

      <Section id="en-7" number={7} title="Your Rights" lang="en">
        <p>In accordance with the Israeli Protection of Privacy Law, 5741-1981, you have the following rights:</p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">Access:</strong> Request a copy of the personal information we hold about you.</li>
          <li><strong className="text-white">Correction:</strong> Request correction of inaccurate or incomplete information.</li>
          <li><strong className="text-white">Deletion:</strong> Request deletion of your personal information, subject to legal requirements.</li>
          <li><strong className="text-white">Opt-out:</strong> Unsubscribe from marketing communications at any time.</li>
        </ul>
        <p className="mt-4">To exercise these rights, contact us at <strong className="text-white">hello@rendeza.com</strong>. We will respond within 30 days.</p>
      </Section>

      <Section id="en-8" number={8} title="Data Retention" lang="en">
        <p>We retain your personal information for as long as necessary to:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>Provide services to you</li>
          <li>Comply with legal obligations</li>
          <li>Resolve disputes</li>
          <li>Enforce our agreements</li>
        </ul>
        <p className="mt-4">After account deletion, we may retain certain information for legal and business purposes (such as transaction records for tax purposes) for up to 7 years as required by law.</p>
      </Section>

      <Section id="en-9" number={9} title="Third-Party Services" lang="en">
        <p>Our Platform integrates with third-party services including:</p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">Payment processors:</strong> Handle transactions securely.</li>
          <li><strong className="text-white">Analytics providers:</strong> Help us understand usage patterns.</li>
          <li><strong className="text-white">Email services:</strong> Send transactional and promotional emails.</li>
          <li><strong className="text-white">Cloud hosting:</strong> Store and process data.</li>
        </ul>
        <p className="mt-4">These services have their own privacy policies. We recommend reviewing them.</p>
      </Section>

      <Section id="en-10" number={10} title="International Transfers" lang="en">
        <p>Your information may be transferred to and processed in countries other than Israel. When we transfer data internationally, we implement appropriate safeguards to protect your information in accordance with applicable law.</p>
      </Section>

      <Section id="en-11" number={11} title="Children's Privacy" lang="en">
        <p>The Platform is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us immediately.</p>
      </Section>

      <Section id="en-12" number={12} title="Changes to This Policy" lang="en">
        <p>We may update this Privacy Policy from time to time. Material changes will be posted on the Platform with a new &quot;Last updated&quot; date. Continued use of the Platform after changes constitutes acceptance of the updated policy.</p>
      </Section>

      <Section id="en-13" number={13} title="Contact Us" lang="en">
        <p>For questions about this Privacy Policy or to exercise your rights:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>Email: <strong className="text-white">hello@rendeza.com</strong></li>
          <li>Website: <strong className="text-white">rendeza.com</strong></li>
        </ul>
        <p className="mt-4">We aim to respond to all inquiries within 3 business days.</p>
      </Section>
    </div>
  );
}

function HebrewContent() {
  const tocItems = [
    { id: 'he-1', title: 'מבוא' },
    { id: 'he-2', title: 'מידע שאנו אוספים' },
    { id: 'he-3', title: 'כיצד אנו משתמשים במידע' },
    { id: 'he-4', title: 'שיתוף מידע' },
    { id: 'he-5', title: 'אבטחת מידע' },
    { id: 'he-6', title: 'עוגיות ומעקב' },
    { id: 'he-7', title: 'הזכויות שלך' },
    { id: 'he-8', title: 'שמירת מידע' },
    { id: 'he-9', title: 'שירותי צד שלישי' },
    { id: 'he-10', title: 'העברות בינלאומיות' },
    { id: 'he-11', title: 'פרטיות ילדים' },
    { id: 'he-12', title: 'שינויים במדיניות' },
    { id: 'he-13', title: 'יצירת קשר' },
  ];

  return (
    <div className="text-right" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <TableOfContents items={tocItems} lang="he" />

      <Section id="he-1" number={1} title="מבוא" lang="he">
        <p>מדיניות פרטיות זו חלה על אתר האינטרנט <strong className="text-white">rendeza.com</strong> (&quot;הפלטפורמה&quot;) המופעל על ידי <strong className="text-white">Rendeza</strong> (&quot;אנחנו&quot; או &quot;הפלטפורמה&quot;).</p>
        <p>אנו מכבדים את זכותך לפרטיות. מדיניות פרטיות זו מפרטת כיצד אנו אוספים, משתמשים ומגנים על מידע שמתקבל מהמשתמשים. אם יש לך שאלות בנוגע למדיניות הפרטיות שלנו, אנא פנה אלינו בכתובת: <strong className="text-white">hello@rendeza.com</strong></p>
        <p>אנא עיין גם ב<Link href="/terms" className="text-amber-400 hover:underline">תנאי השימוש</Link> שלנו. בעצם השימוש בפלטפורמה, הנך מסכים לתנאים המפורטים במדיניות פרטיות זו.</p>
        <HighlightBox>
          <p><strong className="text-amber-400">חשוב:</strong> &quot;מידע אישי&quot; כמשמעותו במדיניות פרטיות זו הינו נתון הנוגע לאדם מזוהה או לאדם הניתן לזיהוי, לרבות שם, מספר טלפון, כתובת, תאריך לידה או כתובת דוא&quot;ל.</p>
        </HighlightBox>
      </Section>

      <Section id="he-2" number={2} title="מידע שאנו אוספים" lang="he">
        <p><strong className="text-white">מידע שאתה מספק:</strong></p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">פרטי חשבון:</strong> שם, כתובת דוא&quot;ל, מספר טלפון וסיסמה בעת הרישום.</li>
          <li><strong className="text-white">פרטי פרופיל:</strong> תמונת פרופיל והעדפות שתבחר לספק.</li>
          <li><strong className="text-white">פרטי עסקאות:</strong> פרטי תשלום (מעובדים על ידי ספקי צד שלישי), רכישות כרטיסים והיסטוריית הזמנות.</li>
          <li><strong className="text-white">מידע על אירועים:</strong> פרטי אירועים שאתה משתתף בהם או מארגן.</li>
          <li><strong className="text-white">תקשורת:</strong> הודעות שאתה שולח לנו או דרך הפלטפורמה.</li>
        </ul>

        <p className="mt-4"><strong className="text-white">מידע שנאסף אוטומטית:</strong></p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">מידע על מכשיר:</strong> כתובת IP, סוג דפדפן, מערכת הפעלה, מזהי מכשיר.</li>
          <li><strong className="text-white">מידע שימוש:</strong> דפים שנצפו, תכונות בשימוש, זמן שהות בפלטפורמה.</li>
          <li><strong className="text-white">מידע מיקום:</strong> מיקום כללי על בסיס כתובת IP.</li>
          <li><strong className="text-white">עוגיות:</strong> כמתואר בסעיף העוגיות להלן.</li>
        </ul>

        <p className="mt-4"><strong className="text-white">מידע ממארגנים:</strong></p>
        <p>עבור מארגני אירועים, אנו עשויים לאסוף מידע עסקי נוסף כולל שם עסק, מספר עוסק/ח.פ., פרטי חשבון בנק להעברות ומסמכי זיהוי כנדרש על פי חוק.</p>
      </Section>

      <Section id="he-3" number={3} title="כיצד אנו משתמשים במידע" lang="he">
        <p>אנו משתמשים במידע שלך למטרות הבאות:</p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">מתן שירותים:</strong> עיבוד רכישות כרטיסים, ניהול הרשמות ומסירת מידע על אירועים.</li>
          <li><strong className="text-white">תקשורת:</strong> שליחת אישורים, עדכונים ומענה לפניות.</li>
          <li><strong className="text-white">שיפור הפלטפורמה:</strong> ניתוח שימוש, פיתוח תכונות חדשות ושיפור חוויית המשתמש.</li>
          <li><strong className="text-white">אבטחה:</strong> זיהוי ומניעת הונאות, גישה לא מורשית ופעילויות בלתי חוקיות.</li>
          <li><strong className="text-white">עמידה בחוק:</strong> ציות לחוקים ותקנות רלוונטיים.</li>
          <li><strong className="text-white">שיווק:</strong> עם הסכמתך, שליחת תקשורת קידומית על אירועים ושירותים.</li>
        </ul>
      </Section>

      <Section id="he-4" number={4} title="שיתוף מידע" lang="he">
        <p>אנו עשויים לשתף את המידע שלך בנסיבות הבאות:</p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">מארגני אירועים:</strong> כאשר אתה רוכש כרטיסים, אנו משתפים מידע נחוץ עם מארגן האירוע (שם, אימייל, פרטי כרטיס).</li>
          <li><strong className="text-white">ספקי שירות:</strong> חברות צד שלישי שעוזרות לנו להפעיל את הפלטפורמה (מעבדי תשלומים, שירותי אימייל, ספקי אחסון).</li>
          <li><strong className="text-white">דרישות חוקיות:</strong> כאשר נדרש על פי חוק, צו בית משפט, או להגנה על זכויותינו ובטיחותנו.</li>
          <li><strong className="text-white">העברות עסקיות:</strong> בקשר למיזוג, רכישה או מכירת נכסים.</li>
        </ul>
        <HighlightBox>
          <p><strong className="text-amber-400">הערה:</strong> אנו לא מוכרים את המידע האישי שלך לצדדים שלישיים למטרות שיווקיות שלהם.</p>
        </HighlightBox>
      </Section>

      <Section id="he-5" number={5} title="אבטחת מידע" lang="he">
        <p>אנו מיישמים אמצעי אבטחה תעשייתיים להגנה על המידע שלך:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>הצפנת SSL/TLS להעברת נתונים</li>
          <li>אחסון מאובטח עם בקרות גישה</li>
          <li>הערכות אבטחה שוטפות</li>
          <li>עיבוד תשלומים דרך ספקים העומדים בתקן PCI-DSS</li>
        </ul>
        <p className="mt-4">אנו לא שומרים פרטי כרטיס אשראי במערכותינו. מידע תשלום מעובד ישירות על ידי שותפי התשלום המאובטחים שלנו.</p>
        <p>למרות שאנו שואפים להגן על המידע שלך, שום שיטת העברה באינטרנט אינה מאובטחת ב-100%. איננו יכולים להבטיח אבטחה מוחלטת.</p>
      </Section>

      <Section id="he-6" number={6} title="עוגיות ומעקב" lang="he">
        <p>אנו משתמשים בעוגיות וטכנולוגיות דומות לשיפור חווייתך:</p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">עוגיות חיוניות:</strong> נדרשות לתפקוד תקין של הפלטפורמה.</li>
          <li><strong className="text-white">עוגיות אנליטיקה:</strong> עוזרות לנו להבין כיצד מבקרים משתמשים בפלטפורמה.</li>
          <li><strong className="text-white">עוגיות העדפות:</strong> זוכרות את ההגדרות וההעדפות שלך.</li>
          <li><strong className="text-white">עוגיות שיווק:</strong> משמשות להצגת פרסומות רלוונטיות (עם הסכמתך).</li>
        </ul>
        <p className="mt-4">ניתן לנהל העדפות עוגיות דרך הגדרות הדפדפן. השבתת עוגיות מסוימות עשויה להשפיע על פונקציונליות הפלטפורמה.</p>
      </Section>

      <Section id="he-7" number={7} title="הזכויות שלך" lang="he">
        <p>בהתאם לחוק הגנת הפרטיות, התשמ&quot;א-1981, יש לך את הזכויות הבאות:</p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">גישה:</strong> לבקש עותק של המידע האישי שאנו מחזיקים אודותיך.</li>
          <li><strong className="text-white">תיקון:</strong> לבקש תיקון מידע לא מדויק או חלקי.</li>
          <li><strong className="text-white">מחיקה:</strong> לבקש מחיקת המידע האישי שלך, בכפוף לדרישות חוקיות.</li>
          <li><strong className="text-white">ביטול הסכמה:</strong> להסיר את עצמך מתקשורת שיווקית בכל עת.</li>
        </ul>
        <p className="mt-4">למימוש זכויות אלה, פנה אלינו בכתובת <strong className="text-white">hello@rendeza.com</strong>. נשיב תוך 30 יום.</p>
      </Section>

      <Section id="he-8" number={8} title="שמירת מידע" lang="he">
        <p>אנו שומרים את המידע האישי שלך כל עוד נחוץ ל:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>מתן שירותים לך</li>
          <li>עמידה בחובות חוקיות</li>
          <li>יישוב מחלוקות</li>
          <li>אכיפת ההסכמים שלנו</li>
        </ul>
        <p className="mt-4">לאחר מחיקת חשבון, אנו עשויים לשמור מידע מסוים למטרות חוקיות ועסקיות (כגון רשומות עסקאות לצרכי מס) עד 7 שנים כנדרש על פי חוק.</p>
      </Section>

      <Section id="he-9" number={9} title="שירותי צד שלישי" lang="he">
        <p>הפלטפורמה שלנו משתלבת עם שירותי צד שלישי כולל:</p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">מעבדי תשלומים:</strong> מטפלים בעסקאות בצורה מאובטחת.</li>
          <li><strong className="text-white">ספקי אנליטיקה:</strong> עוזרים לנו להבין דפוסי שימוש.</li>
          <li><strong className="text-white">שירותי אימייל:</strong> שולחים אימיילים עסקיים וקידומיים.</li>
          <li><strong className="text-white">אחסון ענן:</strong> מאחסנים ומעבדים נתונים.</li>
        </ul>
        <p className="mt-4">לשירותים אלה יש מדיניות פרטיות משלהם. אנו ממליצים לעיין בהן.</p>
      </Section>

      <Section id="he-10" number={10} title="העברות בינלאומיות" lang="he">
        <p>המידע שלך עשוי להיות מועבר ומעובד במדינות אחרות מלבד ישראל. כאשר אנו מעבירים נתונים בינלאומית, אנו מיישמים אמצעי הגנה מתאימים להגנה על המידע שלך בהתאם לחוק החל.</p>
      </Section>

      <Section id="he-11" number={11} title="פרטיות ילדים" lang="he">
        <p>הפלטפורמה אינה מיועדת לילדים מתחת לגיל 13. איננו אוספים ביודעין מידע אישי מילדים מתחת לגיל 13. אם יוודע לך שילד סיפק לנו מידע אישי, אנא צור איתנו קשר מיידית.</p>
      </Section>

      <Section id="he-12" number={12} title="שינויים במדיניות" lang="he">
        <p>אנו עשויים לעדכן מדיניות פרטיות זו מעת לעת. שינויים מהותיים יפורסמו בפלטפורמה עם תאריך &quot;עודכן לאחרונה&quot; חדש. המשך השימוש בפלטפורמה לאחר שינויים מהווה קבלת המדיניות המעודכנת.</p>
      </Section>

      <Section id="he-13" number={13} title="יצירת קשר" lang="he">
        <p>לשאלות בנוגע למדיניות פרטיות זו או למימוש זכויותיך:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>דוא&quot;ל: <strong className="text-white">hello@rendeza.com</strong></li>
          <li>אתר: <strong className="text-white">rendeza.com</strong></li>
        </ul>
        <p className="mt-4">אנו נשתדל להשיב לכל פנייה תוך 3 ימי עסקים.</p>
      </Section>
    </div>
  );
}
