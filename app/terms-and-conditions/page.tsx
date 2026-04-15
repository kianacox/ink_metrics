import type { Metadata } from "next";
import { SiteHeader } from "@/components/shared/site-header";

export const metadata: Metadata = {
  title: "Terms and Conditions — inkMetrics",
  description:
    "Terms governing your use of inkMetrics, including the Data Processing Agreement.",
};

export default function TermsAndConditionsPage() {
  return (
    <div className="flex min-h-dvh min-h-[100dvh] w-full flex-col bg-background">
      <SiteHeader />
      <div className="flex flex-1 flex-col items-center px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
        <div className="w-full max-w-3xl">
          <header className="mb-10 border-b border-border pb-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary sm:text-sm">
              inkMetrics
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
              Terms and Conditions
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Last updated: 15 April 2026
            </p>
          </header>

          <div className="space-y-10 text-sm leading-relaxed sm:text-base">
            <section>
              <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                1. About these terms
              </h2>
              <p className="text-muted-foreground">
                These Terms and Conditions govern your access to and use of
                inkMetrics, a business health application for tattoo artists.
                By creating an account, accessing, or using the service, you
                agree to these terms.
              </p>
              <p className="mt-3 text-muted-foreground">
                If you do not agree to these terms, you must not use the
                service.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                2. Who we are
              </h2>
              <p className="text-muted-foreground">
                inkMetrics is operated under the trading name inkMetrics.
              </p>
              <dl className="mt-4 space-y-1 text-muted-foreground">
                <div className="flex gap-2">
                  <dt className="font-medium text-foreground">Contact:</dt>
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
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                3. Eligibility and account responsibilities
              </h2>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li>
                  You must be at least 18 years old and able to enter into a
                  legally binding agreement.
                </li>
                <li>
                  You are responsible for keeping your login credentials secure
                  and for all activity on your account.
                </li>
                <li>
                  You must provide accurate information and keep account details
                  up to date.
                </li>
                <li>
                  You are responsible for complying with applicable laws in
                  connection with your use of the service.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                4. Service scope
              </h2>
              <p className="text-muted-foreground">
                inkMetrics helps professional tattoo artists track session,
                client, and expense records and generate financial insights.
                Features may evolve over time as the product develops.
              </p>
              <p className="mt-3 text-muted-foreground">
                We may add, modify, or discontinue features where reasonably
                necessary for product, security, or legal reasons.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                5. Acceptable use
              </h2>
              <p className="mb-3 text-muted-foreground">You must not:</p>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li>
                  Use the service for unlawful purposes or in violation of data
                  protection law.
                </li>
                <li>
                  Attempt to gain unauthorized access to other accounts, systems,
                  or data.
                </li>
                <li>
                  Interfere with, disrupt, or reverse engineer the service
                  except as permitted by law.
                </li>
                <li>
                  Upload prohibited or high-risk special category data unless we
                  explicitly support it in writing.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                6. Fees and billing
              </h2>
              <p className="text-muted-foreground">
                If paid plans are offered, pricing and billing terms will be
                presented before purchase. Unless stated otherwise, fees are
                non-refundable except where required by applicable law.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                7. Intellectual property
              </h2>
              <p className="text-muted-foreground">
                We retain all rights, title, and interest in the service,
                software, and branding. Subject to these terms, we grant you a
                limited, non-exclusive, revocable right to use the service for
                your internal business purposes.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                8. Data roles and customer responsibilities
              </h2>
              <p className="mb-3 text-muted-foreground">
                For your account, authentication, security, and operational
                service data, inkMetrics acts as an independent data controller.
              </p>
              <p className="mb-3 text-muted-foreground">
                For client and business records you enter into the service
                (including client names, optional contact details, session
                records, and expense records), you are the data controller and
                inkMetrics acts as your data processor.
              </p>
              <p className="mb-3 text-muted-foreground">
                You are responsible for ensuring you have a lawful basis and
                provide required notices for personal data you input about your
                clients.
              </p>
              <p className="text-muted-foreground">
                Further processor terms are set out in Section 9 (Data
                Processing Agreement).
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                9. Data Processing Agreement (DPA)
              </h2>
              <p className="mb-3 text-muted-foreground">
                This Section 9 forms the Data Processing Agreement between you
                (Controller) and inkMetrics (Processor) for customer personal
                data processed on your behalf.
              </p>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">
                    9.1 Subject matter and duration:
                  </span>{" "}
                  Processing concerns customer personal data you submit to the
                  service. Processing continues for the duration of your use of
                  inkMetrics and as needed to fulfill deletion/return
                  obligations after termination.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    9.2 Nature and purpose:
                  </span>{" "}
                  Storage, organization, retrieval, analysis, and deletion of
                  customer personal data to provide service functionality and
                  secure operations.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    9.3 Types of data and data subjects:
                  </span>{" "}
                  Includes client names, optional contact information, and
                  related session/expense records about your clients and
                  prospects.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    9.4 Instructions:
                  </span>{" "}
                  inkMetrics processes customer personal data only on your
                  documented instructions, as reflected in your use of the
                  service and these terms, unless otherwise required by law.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    9.5 Confidentiality:
                  </span>{" "}
                  Personnel authorized to process customer personal data are
                  subject to confidentiality obligations.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    9.6 Security measures:
                  </span>{" "}
                  inkMetrics implements appropriate technical and organizational
                  measures, including authenticated access controls, row-level
                  data isolation, encrypted transport, and least-privilege
                  operational practices.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    9.7 Subprocessors:
                  </span>{" "}
                  You authorize use of subprocessors needed to operate the
                  service, including infrastructure and communications
                  providers. We remain responsible for subprocessors&apos;
                  compliance with applicable processor obligations and will
                  update subprocessors in our privacy documentation.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    9.8 Data subject rights:
                  </span>{" "}
                  Taking into account processing nature, inkMetrics provides
                  reasonable assistance to help you respond to data subject
                  rights requests relating to customer personal data.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    9.9 Security incidents:
                  </span>{" "}
                  inkMetrics will notify you without undue delay after becoming
                  aware of a personal data breach affecting customer personal
                  data and will provide reasonable cooperation.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    9.10 International transfers:
                  </span>{" "}
                  Where customer personal data is transferred internationally,
                  inkMetrics will apply appropriate transfer safeguards required
                  by UK GDPR, such as adequacy mechanisms or contractual
                  safeguards.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    9.11 Deletion or return:
                  </span>{" "}
                  On account deletion or service termination, customer personal
                  data is deleted from active systems in line with product
                  functionality and operational retention limits, unless
                  retention is legally required.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    9.12 Audit and information rights:
                  </span>{" "}
                  inkMetrics will make available information reasonably
                  necessary to demonstrate compliance with this DPA and, where
                  appropriate, support reasonable audits or inspections subject
                  to confidentiality and security controls.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    9.13 Controller obligations:
                  </span>{" "}
                  You remain responsible for lawfulness, transparency, and data
                  subject communications for customer personal data collected and
                  submitted by you.
                </p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                10. Suspension and termination
              </h2>
              <p className="mb-3 text-muted-foreground">
                We may suspend or terminate access where necessary to address
                security risks, legal requirements, or material breaches of
                these terms.
              </p>
              <p className="text-muted-foreground">
                You may stop using the service at any time and may request
                account deletion through available product controls.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                11. Warranties and liability
              </h2>
              <p className="mb-3 text-muted-foreground">
                The service is provided on an &ldquo;as is&rdquo; and
                &ldquo;as available&rdquo; basis. To the fullest extent
                permitted by law, we disclaim warranties not expressly stated in
                these terms.
              </p>
              <p className="text-muted-foreground">
                Nothing in these terms excludes or limits liability that cannot
                be excluded by law. Subject to that, inkMetrics will not be
                liable for indirect or consequential loss, loss of profits, or
                loss of business opportunity arising from service use.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                12. Changes to these terms
              </h2>
              <p className="text-muted-foreground">
                We may update these terms to reflect legal, operational, or
                product changes. Where changes are material, we will provide
                reasonable notice and update the &ldquo;Last updated&rdquo; date
                above. Continued use after updates takes effect constitutes
                acceptance of the revised terms.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                13. Governing law and contact
              </h2>
              <p className="mb-4 text-muted-foreground">
                These terms are governed by the laws of England and Wales.
                Courts of England and Wales have exclusive jurisdiction, unless
                mandatory local law provides otherwise.
              </p>
              <p className="text-muted-foreground">
                Questions about these terms can be sent to{" "}
                <a
                  href="mailto:support@inkmetrics.app"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  support@inkmetrics.app
                </a>
                .
              </p>
            </section>
          </div>

          <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
            inkMetrics — Terms and Conditions — Last updated 15 April 2026
          </footer>
        </div>
      </div>
    </div>
  );
}
