// Public route — no auth required (app/dashboard/layout.tsx is the only
// place that gates access, and this page isn't under that segment).
// English only, deliberately: legal text needs one authoritative version
// for now, unlike the rest of the dashboard's UI chrome, which goes
// through the bilingual t() system.
export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">SafePath Privacy Policy</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: September 12, 2026</p>

      <p className="mt-8 text-sm leading-relaxed text-zinc-700">
        SafePath (&ldquo;the App,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) is operated by M. M.
        Shahidullah (&ldquo;the Developer&rdquo;). This Privacy Policy explains what information
        SafePath collects, how it is used, and who it is shared with.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">1. What We Collect</h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        <strong>Account information:</strong> email address, password (encrypted, never visible to
        us in plain text), full name, and whether you are using SafePath as a Student/at-risk user
        or as a Guardian.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        <strong>Location information:</strong>
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
        <li>Your device&apos;s location when you trigger an SOS alert</li>
        <li>A periodic location trail while an SOS alert is active</li>
        <li>Your location at the start of a Journey (check-in) and any time you extend it</li>
        <li>
          Your device&apos;s live location if you use the &ldquo;Nearest Police Station&rdquo; or
          &ldquo;Nearest Hospital&rdquo; feature (this is sent directly to Google Maps, not stored
          by us — see Section 4)
        </li>
        <li>
          <strong>Location History (optional, off by default):</strong> if you choose to enable it
          from the &ldquo;Location History Recording&rdquo; card on the Home tab, SafePath
          periodically records your device&apos;s location. You choose how long entries are kept —
          6 hours, 24 hours, 3 days, or 7 days — with 24 hours as the default if you don&apos;t
          change it. This is separate from the alert-based location above, and no history is
          recorded unless you turn it on. See Section 5 for full detail.
        </li>
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        <strong>Emergency contact information:</strong> names and phone numbers you choose to save
        for offline SOS text messages. These are people, not SafePath accounts, and we store this
        data solely so it can be used if you trigger an offline SOS.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        <strong>Guardian relationship information:</strong> if you are a Student, the guardians you
        invite and link to your account. If you are a Guardian, the students who have linked you.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        <strong>Alert history:</strong> records of when SOS or missed-check-in alerts were
        triggered, resolved, and by whom.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        <strong>App preferences:</strong> your chosen language (Bangla/English) and safety feature
        settings (e.g. whether Shake-to-Trigger, Fake Call Escape, or Location History are turned
        on, and your chosen Location History retention period).
      </p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        <strong>We do NOT collect:</strong> advertising identifiers, browsing history outside the
        App, contacts from your phone&apos;s address book (only what you manually type into
        Emergency Contacts), or any data unrelated to the App&apos;s safety purpose.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">2. How We Use Your Information</h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        We use your information only to operate SafePath&apos;s safety features:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
        <li>
          To notify your linked Guardian(s) when you trigger an SOS or miss a Journey check-in
        </li>
        <li>
          To show your Guardian(s) your alert location and history, only while they are linked to
          your account
        </li>
        <li>
          To let you and your linked Guardian(s) review your recent Location History, only if you
          have chosen to enable this optional feature
        </li>
        <li>
          To send offline SOS text messages to your saved Emergency Contacts when you have no
          internet connection
        </li>
        <li>To let you sign in, manage your account, and set your preferences</li>
        <li>To operate the automatic &ldquo;missed check-in&rdquo; safety check for Journeys</li>
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        <strong>
          We do not sell your data. We do not use your data for advertising. We do not share your
          data with any party except as described in this policy.
        </strong>
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        3. Who Can See Your Information
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
        <li>
          <strong>Your linked Guardian(s)</strong> can see your name, your active/past alert
          history, your live location only while an alert is active, and — only if you have chosen
          to enable Location History — your location trail for whichever retention period
          you&apos;ve selected. This access begins only after you have generated an invite code and
          they have accepted it. You can see this relationship reflected on the Guardians screen.
        </li>
        <li>
          <strong>A Guardian&apos;s linked Student(s)</strong> can, symmetrically, see basic
          information about their guardian (name) once the relationship is accepted.
        </li>
        <li>
          <strong>We (the Developer)</strong> can access data only as needed to operate, maintain,
          and troubleshoot the App, or to respond to a request from you.
        </li>
        <li>
          <strong>
            We do not share your information with advertisers, data brokers, or any third party for
            marketing purposes.
          </strong>
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">4. Third-Party Services We Use</h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        SafePath relies on a small number of service providers to operate:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
        <li>
          <strong>Supabase</strong> — our database, authentication, and backend hosting provider.
          Your account data, location data (including Location History, if enabled), and alert
          history are stored on Supabase&apos;s infrastructure, protected by access-control rules
          that restrict who can read what.
        </li>
        <li>
          <strong>Resend</strong> — used to send email alerts to your Guardian(s). Only the alert
          content described in Section 2 is sent through this service.
        </li>
        <li>
          <strong>Google Maps</strong> — when you tap &ldquo;View Last Known Location,&rdquo;
          &ldquo;Nearest Police Station,&rdquo; or &ldquo;Nearest Hospital,&rdquo; your device opens
          Google Maps directly with a search or coordinates. We do not send this data to Google
          ourselves — your device does, the same as if you opened Google Maps and searched yourself.
          Google&apos;s own privacy policy applies to that interaction.
        </li>
        <li>
          <strong>Expo</strong> — the technology platform SafePath&apos;s mobile app is built on,
          used to deliver app updates.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        5. Location Data — Extra Detail
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        SafePath&apos;s location behavior differs depending on which features you use:
      </p>

      <h3 className="mt-6 text-base font-semibold tracking-tight">
        5a. Alert and Journey location (live, event-based)
      </h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
        <li>
          Your location is captured when you actively trigger an SOS, are in an active Journey, or
          tap a &ldquo;Nearest ___&rdquo; button.
        </li>
        <li>
          This location is visible only to your linked Guardian(s), and only while that specific
          alert remains active or in your resolved alert history.
        </li>
        <li>
          You can decline location permission entirely; SOS alerts will still work, just without a
          location attached.
        </li>
        <li>
          Outside of the optional Location History feature described below, we do not track your
          location continuously or in the background.
        </li>
      </ul>

      <h3 className="mt-6 text-base font-semibold tracking-tight">
        5b. Location History (optional, off by default)
      </h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
        <li>
          Location History does not record anything unless you turn it on. It is off by default for
          every user.
        </li>
        <li>You can enable it from the &ldquo;Location History Recording&rdquo; card on the Home tab.</li>
        <li>
          When enabled, you choose how long entries are kept: 6 hours, 24 hours, 3 days, or 7 days.
          If you don&apos;t change this, entries are kept for 24 hours. Entries older than your
          selected period are automatically deleted.
        </li>
        <li>
          Location History is visible only to you and your linked Guardian(s) — never to unrelated
          users, and accessed by us only as described in Section 3.
        </li>
        <li>
          You can turn Location History off at any time from the same Home tab card. Doing so does
          not affect live alert location during an active SOS or Journey (Section 5a), which
          operates independently of this setting.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        6. Minors and Guardian Awareness
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        SafePath does not enforce a strict minimum age, since its purpose includes protecting
        students who may be minors. However:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
        <li>
          We strongly expect and design around every Student user having at least one Guardian aware
          of and linked to their account.
        </li>
        <li>
          Guardians are responsible for understanding they are taking on a safety-monitoring role
          for the Student(s) linked to them, which may include visibility into that Student&apos;s
          Location History if the Student has chosen to enable it.
        </li>
        <li>
          If you are a parent or guardian and believe a minor has created an account without your
          awareness, please contact us using the information in Section 9 and we will assist with
          account review or removal.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        7. Data Retention and Your Rights
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
        <li>
          We retain your account and alert history data for as long as your account is active, so
          that alert history remains useful to you and your Guardian(s).
        </li>
        <li>
          If you enable Location History, entries are retained for whichever period you select (6
          hours, 24 hours, 3 days, or 7 days — 24 hours by default) and are automatically deleted
          once that period elapses.
        </li>
        <li>
          You may request deletion of your account and associated data, correction of inaccurate
          information, or a copy of the data we hold about you, at any time, by contacting us
          (Section 9).
        </li>
        <li>
          Deleting your account will also remove any guardian_link relationships tied to it, and
          immediately deletes any remaining Location History entries.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">8. Data Security</h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        We use industry-standard practices to protect your data, including encrypted storage,
        row-level access controls that restrict data visibility to only the people who should see it
        (e.g. only your accepted Guardian, never an unrelated user), and encrypted connections
        between the App and our servers. No system can guarantee absolute security, but we take
        reasonable, ongoing steps to protect your information.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">9. Contact Us</h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        For any question about this policy, or to request access, correction, or deletion of your
        data:
      </p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        <strong>Email:</strong>{' '}
        <a href="mailto:mmshahidullah103@gmail.com" className="text-blue-600 underline">
          mmshahidullah103@gmail.com
        </a>
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">10. Changes to This Policy</h2>
      <p className="mt-3 mb-10 text-sm leading-relaxed text-zinc-700">
        If we make material changes to this policy, we will update the &ldquo;Last updated&rdquo;
        date above and, where practical, notify users within the App.
      </p>
    </main>
  );
}
