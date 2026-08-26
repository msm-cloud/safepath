// Public route — no auth required (app/dashboard/layout.tsx is the only
// place that gates access, and this page isn't under that segment).
// English only, deliberately: legal text needs one authoritative version
// for now, unlike the rest of the dashboard's UI chrome, which goes
// through the bilingual t() system.
export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">SafePath Privacy Policy</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: August 26, 2026</p>

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
        settings (e.g. whether Shake-to-Trigger or Fake Call Escape are turned on).
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
          history, and your live location only while an alert is active — and only after you have
          generated an invite code and they have accepted it. You can see this relationship
          reflected on the Guardians screen.
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
          Your account data, location data, and alert history are stored on Supabase&apos;s
          infrastructure, protected by access-control rules that restrict who can read what.
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
        Location is central to SafePath&apos;s safety purpose, so we want to be extra clear about
        it:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
        <li>
          Your location is only captured when you actively trigger an SOS, are in an active Journey,
          or tap a &ldquo;Nearest ___&rdquo; button.
        </li>
        <li>
          We do not track your location continuously or in the background outside of an active SOS
          alert.
        </li>
        <li>
          Location during an active alert is visible only to your linked Guardian(s), and only while
          that specific alert remains active or in your resolved alert history.
        </li>
        <li>
          You can decline location permission entirely; SOS alerts will still work, just without a
          location attached.
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
          for the Student(s) linked to them.
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
          You may request deletion of your account and associated data, correction of inaccurate
          information, or a copy of the data we hold about you, at any time, by contacting us
          (Section 9).
        </li>
        <li>Deleting your account will also remove any guardian_link relationships tied to it.</li>
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
