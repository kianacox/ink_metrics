import type { Metadata } from "next";
import { AppChrome } from "@/components/shared/app-chrome";

export const metadata: Metadata = {
  title: "Privacy Policy — inkMetrics",
  description:
    "How inkMetrics collects, uses, and protects your personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <AppChrome>
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-10 border-b border-border pb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary sm:text-sm">
            inkMetrics
          </p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated: 14 April 2026
          </p>
        </header>

        <div className="space-y-10 text-sm leading-relaxed text-foreground sm:text-base">
          {/* Section 1 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              1. Who we are
            </h2>
            <p className="text-muted-foreground">
              inkMetrics is a business intelligence application built for
              professional tattoo artists. It is operated as a sole trader /
              independent service under the trading name inkMetrics.
            </p>
            <dl className="mt-4 space-y-1 text-muted-foreground">
              <div className="flex gap-2">
                <dt className="font-medium text-foreground">
                  Data controller:
                </dt>
                <dd>inkMetrics</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium text-foreground">Contact email:</dt>
                <dd>
                  <a
                    href="mailto:support@inkmetrics.app"
                    className="text-primary underline underline-offset-4 hover:text-primary/80"
                  >
                    support@inkmetrics.app
                  </a>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-muted-foreground">
              If you have any questions about how your personal data is handled,
              please contact us at the address above.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              2. What personal data we collect
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-base font-semibold text-foreground sm:text-lg">
                  2.1 Account and authentication data
                </h3>
                <p className="mb-3 text-muted-foreground">
                  When you create an account and use the service we collect:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                  <li>
                    Email address (used for sign-up, login, password reset, and
                    account updates)
                  </li>
                  <li>
                    Password credential (stored as a cryptographic hash by our
                    authentication provider — we never see your plain-text
                    password)
                  </li>
                  <li>
                    Authentication identifiers and metadata (user ID,
                    confirmation and recovery tokens managed by Supabase Auth)
                  </li>
                  <li>
                    Session and authentication cookie data used to keep you
                    securely logged in
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 text-base font-semibold text-foreground sm:text-lg">
                  2.2 Profile and preference data
                </h3>
                <p className="mb-3 text-muted-foreground">
                  Once you are signed in, you may provide:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                  <li>Display name</li>
                  <li>Default currency preference</li>
                  <li>Reporting timezone and week-start preference</li>
                  <li>Profile completion status and timestamps</li>
                  <li>
                    UI preference for advertising attribution tracking (a
                    display toggle)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 text-base font-semibold text-foreground sm:text-lg">
                  2.3 Financial and business configuration
                </h3>
                <p className="mb-3 text-muted-foreground">
                  To calculate your true net profit, you may configure:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                  <li>
                    Whether you pay chair rent or work on commission
                  </li>
                  <li>Rent type, frequency, and fixed amounts</li>
                  <li>
                    Commission rates, caps, and effective date ranges (version
                    history is maintained to keep historical reports accurate)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 text-base font-semibold text-foreground sm:text-lg">
                  2.4 Session logging data
                </h3>
                <p className="mb-3 text-muted-foreground">
                  Each time you log a tattoo session you provide:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                  <li>Session revenue (stored in minor currency units)</li>
                  <li>Session duration and date/time</li>
                  <li>A link to the client record for that session</li>
                  <li>An optional advertising-attribution flag</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 text-base font-semibold text-foreground sm:text-lg">
                  2.5 Client data you enter (data stored on your behalf)
                </h3>
                <p className="mb-3 text-muted-foreground">
                  As an artist, you may store records about your own clients.
                  This data is entered by you and held by inkMetrics on your
                  behalf. It may include:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                  <li>Client name</li>
                  <li>Optional contact information (free-text field)</li>
                  <li>
                    Client acquisition source (advertising or organic), if you
                    have enabled that feature
                  </li>
                </ul>
                <p className="mt-3 text-muted-foreground">
                  See Section 8 (Your role as a data controller) for your
                  responsibilities in relation to this data.
                </p>
              </div>

              <div>
                <h3 className="mb-3 text-base font-semibold text-foreground sm:text-lg">
                  2.6 Expense and receipt data
                </h3>
                <p className="mb-3 text-muted-foreground">
                  If you use the expenses feature, you may log:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                  <li>Expense item name and category</li>
                  <li>Amount, currency, and purchase date</li>
                  <li>
                    Optional receipt file (stored in a private,
                    access-controlled storage bucket)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 text-base font-semibold text-foreground sm:text-lg">
                  2.7 Data collected automatically
                </h3>
                <p className="mb-3 text-muted-foreground">
                  When you use the application, we and our infrastructure
                  providers may automatically collect:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                  <li>
                    Authentication and session tokens (required for secure
                    login)
                  </li>
                  <li>
                    Basic request metadata processed by our hosting provider
                    (Vercel) and database provider (Supabase) for service
                    operation and security
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              3. How and why we use your data
            </h2>
            <p className="mb-4 text-muted-foreground">
              We only process your personal data where we have a valid lawful
              basis under UK GDPR.
            </p>
            <div className="space-y-4">
              {[
                {
                  purpose:
                    "Providing the service (account creation, login, dashboard, session/client/expense management)",
                  basis:
                    "Performance of a contract (Article 6(1)(b)) — processing is necessary to deliver the service you have signed up for.",
                },
                {
                  purpose: "Security, fraud prevention, and service integrity",
                  basis:
                    "Legitimate interests (Article 6(1)(f)) — we have a legitimate interest in keeping the service and its users secure.",
                },
                {
                  purpose:
                    "Sending transactional emails (sign-up confirmation, password reset)",
                  basis:
                    "Performance of a contract — these communications are necessary to operate your account.",
                },
                {
                  purpose: "Sending marketing and product update emails",
                  basis:
                    "Consent (Article 6(1)(a) and PECR) — we will only send you marketing emails if you have explicitly opted in at sign-up or via your account settings. You may withdraw consent at any time.",
                },
                {
                  purpose:
                    "Compliance with legal obligations (including Making Tax Digital record-keeping)",
                  basis:
                    "Legal obligation (Article 6(1)(c)) — where applicable.",
                },
              ].map(({ purpose, basis }) => (
                <div
                  key={purpose}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <p className="font-medium text-foreground">{purpose}</p>
                  <p className="mt-1 text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Lawful basis:{" "}
                    </span>
                    {basis}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              4. How long we keep your data
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                We retain your personal data for as long as your account is
                active. When you delete your account, all associated data —
                including your profile, sessions, clients, expenses, and any
                uploaded receipts — is permanently deleted from our systems.
              </p>
              <p>
                You may also delete individual records (sessions, clients,
                expenses) at any time from within the application.
              </p>
              <p>
                Where we are required by law to retain certain records for a
                minimum period, we will retain only the minimum necessary and
                inform you accordingly. We do not currently have any such legal
                retention obligations that override account deletion.
              </p>
              <p>
                Note: We are working to implement a self-service data export
                feature (planned for a future release). Until that is available,
                you may request a copy of your data by contacting us at{" "}
                <a
                  href="mailto:support@inkmetrics.app"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  support@inkmetrics.app
                </a>
                .
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              5. Who we share your data with
            </h2>
            <p className="mb-4 text-muted-foreground">
              We do not sell your personal data. We share data only with the
              following sub-processors who help us operate the service:
            </p>
            <div className="space-y-4">
              {[
                {
                  name: "Supabase (supabase.com)",
                  description:
                    "Provides our database, authentication, and file storage infrastructure. Your account data, session data, client records, expense data, and receipt files are stored on Supabase-managed infrastructure. Supabase processes data in accordance with UK GDPR and maintains appropriate data transfer safeguards.",
                },
                {
                  name: "Vercel (vercel.com)",
                  description:
                    "Hosts and serves the inkMetrics web application. Vercel may process request metadata as part of serving the application. Vercel maintains SOC 2 compliance and appropriate data protection standards.",
                },
                {
                  name: "Resend (resend.com)",
                  description:
                    "Processes outbound emails on our behalf, including sign-up confirmations, password resets, and (where you have consented) marketing communications. Resend processes your email address for this purpose only.",
                },
              ].map(({ name, description }) => (
                <div
                  key={name}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <p className="font-medium text-foreground">{name}</p>
                  <p className="mt-1 text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-muted-foreground">
              We will update this section when additional sub-processors are
              introduced (for example, a product analytics provider is planned
              for a future release).
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              6. International data transfers
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Some of our sub-processors may store or process data outside the
                UK or European Economic Area (EEA). Where this occurs, we ensure
                that appropriate safeguards are in place, such as the UK
                International Data Transfer Agreement (IDTA) or the UK Addendum
                to the EU Standard Contractual Clauses, or transfers to
                countries with UK adequacy decisions.
              </p>
              <p>
                If you would like further information about the specific transfer
                safeguards applicable to any sub-processor, please contact us at{" "}
                <a
                  href="mailto:support@inkmetrics.app"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  support@inkmetrics.app
                </a>
                .
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              7. Cookies and similar technologies
            </h2>
            <p className="mb-3 text-muted-foreground">
              inkMetrics uses strictly necessary cookies and similar
              technologies to operate the service:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                Authentication session cookies — used to keep you securely
                logged in across browser sessions. These are essential for the
                application to function.
              </li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              We do not currently use any non-essential cookies (such as
              analytics or advertising cookies). If this changes in a future
              release, we will update this policy and, where required by law,
              obtain your consent before placing any non-essential cookies.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              8. Your role as a data controller for client data
            </h2>
            <p className="mb-3 text-muted-foreground">
              When you use inkMetrics to store information about your own tattoo
              clients (their names and contact details), you are acting as a
              data controller for that client data. inkMetrics acts as your data
              processor — we store and process that data only on your
              instructions and in accordance with our Data Processing Agreement
              (set out in our Terms and Conditions).
            </p>
            <p className="mb-3 text-muted-foreground">
              As a data controller, you are responsible for:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                Having a lawful basis under UK GDPR to store your clients&apos;
                personal data
              </li>
              <li>Providing appropriate privacy notices to your clients</li>
              <li>Ensuring the accuracy of the data you enter</li>
              <li>
                Responding to any data subject rights requests from your clients
              </li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              If you are unsure of your obligations as a data controller, we
              recommend seeking independent legal advice or consulting the ICO
              website at{" "}
              <a
                href="https://ico.org.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                ico.org.uk
              </a>
              .
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              9. Your data protection rights
            </h2>
            <p className="mb-4 text-muted-foreground">
              Under UK GDPR, you have the following rights in relation to the
              personal data we hold about you:
            </p>
            <div className="space-y-3">
              {[
                {
                  right: "Right of access",
                  description:
                    "You can request a copy of the personal data we hold about you.",
                },
                {
                  right: "Right to rectification",
                  description:
                    "You can ask us to correct inaccurate or incomplete data.",
                },
                {
                  right: "Right to erasure",
                  description:
                    "You can request deletion of your personal data. You can action this directly by deleting your account in the application, or by contacting us.",
                },
                {
                  right: "Right to restriction",
                  description:
                    "You can ask us to restrict processing of your data in certain circumstances.",
                },
                {
                  right: "Right to data portability",
                  description:
                    "You can request your data in a structured, machine-readable format. A self-service export feature is planned; in the meantime, please contact us.",
                },
                {
                  right: "Right to object",
                  description:
                    "You can object to processing based on legitimate interests, and you can withdraw marketing consent at any time.",
                },
                {
                  right: "Right to complain",
                  description: null,
                  custom: (
                    <>
                      You have the right to lodge a complaint with the UK
                      supervisory authority, the Information Commissioner&apos;s
                      Office (ICO), at{" "}
                      <a
                        href="https://ico.org.uk"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-4 hover:text-primary/80"
                      >
                        ico.org.uk
                      </a>{" "}
                      or by calling 0303 123 1113.
                    </>
                  ),
                },
              ].map(({ right, description, custom }) => (
                <div
                  key={right}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <p className="font-medium text-foreground">{right}</p>
                  <p className="mt-1 text-muted-foreground">
                    {custom ?? description}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-muted-foreground">
              To exercise any of the above rights, please contact us at{" "}
              <a
                href="mailto:support@inkmetrics.app"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                support@inkmetrics.app
              </a>
              . We will respond within one calendar month. We may ask you to
              verify your identity before processing your request.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              10. How we protect your data
            </h2>
            <p className="mb-3 text-muted-foreground">
              We take security seriously and implement the following measures:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                Row-Level Security (RLS) on all database tables — your data is
                isolated from other users at the database level
              </li>
              <li>
                All API endpoints require authenticated sessions; unauthenticated
                requests are rejected
              </li>
              <li>
                Receipt files are stored in a private storage bucket with
                per-user prefix access controls
              </li>
              <li>
                Data is encrypted in transit (TLS/HTTPS) and at rest via our
                infrastructure providers
              </li>
              <li>
                We follow a principle of least privilege in our codebase and
                infrastructure configuration
              </li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              Despite these measures, no system is completely immune to security
              risks. In the event of a personal data breach that poses a risk to
              your rights and freedoms, we will notify you and, where required,
              the ICO within the timescales required by UK GDPR.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              11. Children
            </h2>
            <p className="text-muted-foreground">
              inkMetrics is intended for use by professional tattoo artists and
              is not directed at anyone under the age of 18. We do not knowingly
              collect personal data from anyone under 18. If you believe we have
              inadvertently collected data from a minor, please contact us at{" "}
              <a
                href="mailto:support@inkmetrics.app"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                support@inkmetrics.app
              </a>{" "}
              and we will delete it promptly.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              12. Changes to this policy
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                We may update this Privacy Policy from time to time to reflect
                changes in the service, legal requirements, or our data
                practices. When we make material changes, we will notify you by
                email (to the address associated with your account) and update
                the &lsquo;Last updated&rsquo; date at the top of this document.
              </p>
              <p>
                Continued use of the service after a policy update constitutes
                acceptance of the revised policy. If you do not agree with the
                updated policy, you should stop using the service and delete
                your account.
              </p>
            </div>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              13. Contact us
            </h2>
            <p className="mb-4 text-muted-foreground">
              If you have any questions, concerns, or requests relating to this
              Privacy Policy or your personal data, please contact us:
            </p>
            <div className="rounded-lg border border-border bg-card p-4 text-muted-foreground">
              <dl className="space-y-1">
                <div className="flex gap-2">
                  <dt className="font-medium text-foreground">Email:</dt>
                  <dd>
                    <a
                      href="mailto:support@inkmetrics.app"
                      className="text-primary underline underline-offset-4 hover:text-primary/80"
                    >
                      support@inkmetrics.app
                    </a>
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium text-foreground">
                    Trading name:
                  </dt>
                  <dd>inkMetrics</dd>
                </div>
              </dl>
            </div>
            <p className="mt-4 text-muted-foreground">
              We aim to respond to all enquiries within 5 working days and will
              always respond within the one-month period required by UK GDPR.
            </p>
          </section>
        </div>

        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          inkMetrics — Privacy Policy — Last updated 14 April 2026
        </footer>
      </div>
    </AppChrome>
  );
}
