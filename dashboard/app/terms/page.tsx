// Public route — no auth required (app/dashboard/layout.tsx is the only
// place that gates access, and this page isn't under that segment).
// English only, deliberately — see app/privacy/page.tsx for the same note.
export default function TermsOfServicePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">SafePath Terms of Service</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: August 26, 2026</p>

      <p className="mt-8 text-sm leading-relaxed text-zinc-700">
        SafePath is operated by M. M. Shahidullah (&ldquo;the Developer,&rdquo; &ldquo;we,&rdquo;
        &ldquo;us&rdquo;). By creating an account or using SafePath (&ldquo;the App&rdquo;), you
        agree to these Terms.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        1. What SafePath Is — and Is Not
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        SafePath is a personal safety companion app that helps notify a trusted Guardian when a
        Student/at-risk user triggers an SOS alert or misses a scheduled check-in during a Journey.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        <strong>SafePath is NOT a substitute for emergency services.</strong> In a genuine,
        immediate emergency, always contact your local emergency services directly (in Bangladesh:
        999) first. SafePath is a tool to help notify a personal guardian — it does not contact
        police, ambulances, or fire services on your behalf, and delivery of any alert through
        SafePath is not guaranteed (see Section 5).
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">2. Eligibility and Accounts</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
        <li>
          SafePath does not enforce a strict minimum age. Students who are minors are expected to
          have at least one Guardian aware of and linked to their account.
        </li>
        <li>You must provide accurate information when creating an account.</li>
        <li>
          You are responsible for keeping your password secure and for all activity under your
          account.
        </li>
        <li>
          One person should not create multiple accounts to circumvent the App&apos;s intended
          guardian-linking design.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">3. Acceptable Use</h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        You agree to use SafePath only for its intended safety purpose. You agree not to:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
        <li>
          Trigger SOS alerts as a prank, test on someone else without consent, or in bad faith,
          since this could cause real distress to a Guardian who believes it is genuine
        </li>
        <li>
          Use the App to harass, stalk, or monitor another person without their knowledge and
          consent
        </li>
        <li>Attempt to access another user&apos;s account or data without authorization</li>
        <li>Interfere with or attempt to disrupt the App&apos;s operation</li>
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        We reserve the right to suspend or terminate accounts that violate these Terms, particularly
        any use that endangers or harasses another person.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">4. The Guardian Relationship</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
        <li>
          Becoming a Guardian for a Student is a real responsibility: you may receive urgent alerts
          and are expected to respond to them appropriately.
        </li>
        <li>
          SafePath cannot guarantee that a Guardian will see, respond to, or act on an alert in any
          particular timeframe. The App is a notification tool, not a monitored emergency response
          service.
        </li>
        <li>
          Guardian and Student relationships require mutual action (an invite code generated and
          accepted) — SafePath does not link accounts without both parties&apos; participation.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        5. No Guarantee of Delivery — Please Read Carefully
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        SafePath is provided on a best-effort basis. While we have built and tested the App&apos;s
        alert systems carefully,{' '}
        <strong>
          we cannot guarantee that any alert, notification, or message will be delivered
          successfully in every circumstance.
        </strong>{' '}
        Alert delivery can be affected by factors outside our control, including but not limited to:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
        <li>
          Your device having no internet connection and no saved emergency contacts for offline
          fallback
        </li>
        <li>Your device&apos;s location services being unavailable or denied</li>
        <li>Third-party service outages (e.g. our email or backend providers)</li>
        <li>Your Guardian&apos;s own phone, app, or notification settings</li>
        <li>
          Your phone&apos;s battery, connectivity, or operating system restricting the App&apos;s
          ability to run
        </li>
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        <strong>
          You should never rely on SafePath as your only safety measure in a genuine emergency.
        </strong>{' '}
        Always have alternative plans (calling 999, telling people in person, etc.) for situations
        where you cannot depend on a phone or app functioning as expected.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">6. Limitation of Liability</h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        To the fullest extent permitted by law, the Developer is not liable for any injury, loss, or
        damage arising from your use of, or inability to use, SafePath, including but not limited to
        a failed, delayed, or incomplete alert delivery. SafePath is provided &ldquo;as is&rdquo;
        and &ldquo;as available,&rdquo; without warranties of any kind, express or implied,
        regarding its reliability, availability, or fitness for a particular purpose.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        This does not exclude any liability that cannot legally be excluded under applicable law.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">7. Your Content</h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        You retain ownership of the information you provide (your name, emergency contacts, journey
        notes, etc.). By providing this content, you allow SafePath to use it solely to operate the
        App&apos;s features as described in our Privacy Policy.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        8. Changes to the App and These Terms
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        We may update SafePath&apos;s features and these Terms over time. If we make material
        changes to these Terms, we will update the &ldquo;Last updated&rdquo; date above and, where
        practical, notify users within the App. Continued use of SafePath after changes take effect
        constitutes acceptance of the updated Terms.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">9. Termination</h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        You may stop using SafePath and request account deletion at any time (see our Privacy Policy
        for how). We may suspend or terminate accounts that violate these Terms, particularly for
        misuse that could endanger or harass another person.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">10. Governing Law</h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        These Terms are governed by the laws of Bangladesh, without regard to conflict-of-law
        principles.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">11. Contact Us</h2>
      <p className="mt-3 mb-10 text-sm leading-relaxed text-zinc-700">
        <strong>Email:</strong>{' '}
        <a href="mailto:mmshahidullah103@gmail.com" className="text-blue-600 underline">
          mmshahidullah103@gmail.com
        </a>
      </p>
    </main>
  );
}
