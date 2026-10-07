// Update this file before every `eas update` that changes something users
// will notice. Shown once per device after the update lands: give it a new
// id and a few short, non-technical bullets in both languages. Leave id
// empty for small bug-fix updates that need no note.

export type WhatsNewNote = {
  id: string;
  en: string[];
  bn: string[];
};

export const WhatsNew: WhatsNewNote = {
  id: '1.2.0',
  en: [
    'Guardians can now share their location with you too, not just the other way round.',
    'Location history is more reliable, and guardians see recorded places correctly.',
    'A fresh new look for the home, SOS, settings and sign-in screens.',
    'Invite codes now expire after 24 hours, and you can remove a guardian yourself.',
    'SOS works better without internet: your emergency contacts and language are kept.',
    'The app now updates itself and lets you know when a new version is ready.',
  ],
  bn: [
    'এখন অভিভাবকও আপনার সাথে তাঁর লোকেশন শেয়ার করতে পারবেন।',
    'লোকেশন হিস্ট্রি এখন আরও নির্ভরযোগ্য, অভিভাবক রেকর্ড করা জায়গাগুলো ঠিকঠাক দেখতে পান।',
    'হোম, SOS, সেটিংস ও সাইন-ইন স্ক্রিন এসেছে নতুন রূপে।',
    'আমন্ত্রণ কোড এখন ২৪ ঘণ্টা পর বাতিল হয়, আর আপনি নিজেই কোনো অভিভাবককে সরাতে পারবেন।',
    'ইন্টারনেট ছাড়াও SOS আরও ভালো কাজ করে: জরুরি যোগাযোগ ও ভাষা মনে থাকে।',
    'অ্যাপ এখন নিজে থেকেই আপডেট হয়, আর নতুন সংস্করণ তৈরি হলে আপনাকে জানায়।',
  ],
};
