// Nura Check-In engine: scheduled check-ins and server-side escalation.
//
// The timer runs here, on the server, so escalation continues even if the patient's
// phone is off. Messages to contacts go through `deliver()`: in demo mode they are only
// stored (and shown on the in-app "contact's phone" screen); a real SMS/voice provider
// can be plugged in there without touching the rest.
const Monitoring = require('../models/Monitoring');
const CareContact = require('../models/CareContact');
const OutboundMessage = require('../models/OutboundMessage');
const User = require('../models/User');

const TZ = process.env.CLINIC_TIMEZONE || 'Asia/Karachi';
const TICK_MS = 5000;

// One change at a time per patient. The scheduler and API requests both modify the same
// session; without this they could overwrite each other or run an escalation step twice
// (e.g. send the same alert SMS twice). Single server instance, so an in-process lock is enough.
const locks = new Map();
const withLock = (key, fn) => {
  const prev = locks.get(key) || Promise.resolve();
  const run = prev.then(fn, fn);
  const settled = run.catch(() => {});
  locks.set(key, settled);
  settled.then(() => { if (locks.get(key) === settled) locks.delete(key); });
  return run;
};
const userLock = (userId, fn) => withLock(`user:${userId}`, fn);

// Demo speed: one "minute" of the schedule passes in one second
const unitMs = (m) => (m.demoSpeed ? 1000 : 60000);
const after = (m, minutes, from = new Date()) => new Date(from.getTime() + minutes * unitMs(m));
const minutesBetween = (m, a, b) => (b.getTime() - a.getTime()) / unitMs(m);

const firstName = (name) => (name || '').trim().split(/\s+/)[0] || 'They';

// ── Escalation plan (relative to when a check-in was sent, in schedule minutes) ──
// Mirrors the design: notification -> loud alert -> call the patient -> SMS contacts -> call contacts
const escalationPlan = (m, contacts) => {
  const A = m.alertAfterMin;
  const plan = [
    { key: 'notify', at: 0, label: 'Check-in notification sent' },
    { key: 'loud', at: Math.round(A * 0.5), label: 'Loud alert with sound and vibration' },
    { key: 'call_user', at: Math.round(A * 0.67), label: 'Calling your phone', detail: "Automated voice call. Press 1 if you're OK." },
    { key: 'sms_contacts', at: A, label: `SMS to ${contacts.length ? contacts.map((c) => c.name).join(' and ') : 'your contacts'} with your location` }
  ];
  contacts.slice(0, 3).forEach((c, i) => {
    plan.push({ key: `call_contact_${i + 1}`, at: Math.round(A * (1.5 + i * 0.5)), label: `Call ${c.name}`, contactId: String(c._id) });
  });
  return plan;
};

// ── Messages ──────────────────────────────────────────────────────────────
const REASON_UR = { fever: 'بخار', headache: 'سر درد', stomach: 'پیٹ کی تکلیف', cough: 'کھانسی', general: 'طبیعت کی خرابی' };
const REASON_EN = { fever: 'a fever', headache: 'a headache', stomach: 'stomach trouble', cough: 'a cough', general: 'feeling unwell' };

const mapsLink = (loc) => (loc && Number.isFinite(loc.lat) ? `https://maps.google.com/?q=${loc.lat.toFixed(5)},${loc.lng.toFixed(5)}` : '');
const clock = (d) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(d).toUpperCase();

const templates = {
  consent: (patient, contact) => ({
    body: `${firstName(patient.name)} has added you as an emergency contact on MediGuide. If they miss a health check-in, we'll text you. Reply YES to agree or NO to decline.`,
    bodyUrdu: `${firstName(patient.name)} نے آپ کو MediGuide پر ہنگامی رابطے کے طور پر شامل کیا ہے۔ اگر وہ صحت کی جانچ کا جواب نہ دیں تو ہم آپ کو پیغام بھیجیں گے۔ رضامندی کے لیے YES اور انکار کے لیے NO لکھیں۔`
  }),
  consentThanks: (patient) => ({ body: `Thank you. You're now ${firstName(patient.name)}'s emergency contact.` }),
  consentDeclined: () => ({ body: "Okay, you won't receive alerts. You can be added again later." }),
  alert: (patient, m, minutes) => {
    const name = firstName(patient.name);
    const loc = m.lastLocation;
    return {
      body: `${name} turned on health monitoring for ${REASON_EN[m.reason] || REASON_EN.general} and hasn't answered their check-ins for ${minutes} minutes. Please try to reach ${name}.` +
        `${loc && loc.at ? `\n\nLast known location (${clock(loc.at)}): ${mapsLink(loc)}` : ''}\n\nReply OK once you've reached ${name}. If it's an emergency, call 1122.`,
      bodyUrdu: `${name} نے ${REASON_UR[m.reason] || REASON_UR.general} کی وجہ سے صحت کی نگرانی شروع کی تھی اور ${minutes} منٹ سے جواب نہیں دیا۔ براہ کرم ان سے رابطہ کریں۔`,
      link: mapsLink(loc)
    };
  },
  help: (patient, m) => {
    const name = firstName(patient.name);
    const loc = m.lastLocation;
    return {
      body: `${name} pressed "Need help" during a MediGuide health check-in. Please contact ${name} now.` +
        `${loc && loc.at ? `\n\nLast known location (${clock(loc.at)}): ${mapsLink(loc)}` : ''}\n\nReply OK once you've reached ${name}. If it's an emergency, call 1122.`,
      bodyUrdu: `${name} نے صحت کی جانچ کے دوران "مدد چاہیے" دبایا ہے۔ براہ کرم فوراً ان سے رابطہ کریں۔ ہنگامی صورت میں 1122 پر کال کریں۔`,
      link: mapsLink(loc)
    };
  },
  allClear: (patient) => ({
    body: `Update: ${firstName(patient.name)} has checked in and says they're OK. No action needed. Thank you.`,
    bodyUrdu: `${firstName(patient.name)} نے جواب دے دیا ہے اور وہ ٹھیک ہیں۔ کسی کارروائی کی ضرورت نہیں۔ شکریہ۔`
  }),
  callContact: (patient) => ({ body: `Automated call from MediGuide about ${firstName(patient.name)}: they haven't answered their health check-ins. Press 1 to confirm you'll check on them.` }),
  callUser: () => ({ body: "Automated call from MediGuide: Nura hasn't heard from you. Press 1 if you're OK." })
};

// The one place messages leave the system. Demo mode stores them for the in-app phone view.
const deliver = async ({ owner, contact, monitoring, channel = 'sms', kind, body, bodyUrdu = '', link = '' }) => {
  return OutboundMessage.create({
    owner,
    contact: contact ? contact._id : null,
    monitoring: monitoring ? monitoring._id : null,
    direction: 'out',
    channel,
    kind,
    to: contact ? contact.phone : 'patient',
    body,
    bodyUrdu,
    link,
    delivery: 'demo'
  });
};

const sendConsent = async (patient, contact) => {
  await deliver({ owner: patient._id, contact, kind: 'consent', ...templates.consent(patient, contact) });
};

// ── Helpers ───────────────────────────────────────────────────────────────
const openCheckIn = (m) => {
  const last = m.checkIns[m.checkIns.length - 1];
  return last && !last.answeredAt ? last : null;
};

const agreedContacts = (userId) => CareContact.find({ owner: userId, consent: 'agreed' }).sort({ order: 1, createdAt: 1 });

const hourInTz = (d) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(d));

// Next check-in time, skipping 10 PM - 7 AM when overnight check-ins are off
const nextCheckIn = (m, from = new Date()) => {
  let next = after(m, m.intervalMin, from);
  if (!m.overnight && !m.demoSpeed) {
    for (let i = 0; i < 12 && (hourInTz(next) >= 22 || hourInTz(next) < 7); i++) {
      next = new Date(next.getTime() + 60 * 60000);
    }
  }
  return next;
};

const log = (m, type, text) => { m.events.push({ at: new Date(), type, text }); };

// ── Escalation step execution ─────────────────────────────────────────────
const runStep = async (m, ci, step, patient, contacts) => {
  ci.stepsDone.push({ key: step.key, at: new Date() });
  if (step.key === 'notify') log(m, 'checkin_sent', 'Check-in sent');
  if (step.key === 'loud') log(m, 'loud_alert', 'Loud reminder with sound and vibration');
  if (step.key === 'call_user') {
    log(m, 'call_user', 'Automated call to the patient');
    await deliver({ owner: patient._id, monitoring: m, channel: 'call', kind: 'call_user', ...templates.callUser() });
  }
  if (step.key === 'sms_contacts') {
    const minutes = Math.round(m.alertAfterMin);
    ci.alertSentAt = new Date();
    for (const c of contacts) {
      await deliver({ owner: patient._id, contact: c, monitoring: m, kind: 'alert', ...templates.alert(patient, m, minutes) });
    }
    log(m, 'sms_contact', contacts.length ? `Alert SMS sent to ${contacts.map((c) => c.name).join(', ')}` : 'No agreed contacts to alert');
  }
  if (step.key.startsWith('call_contact_')) {
    const c = contacts.find((x) => String(x._id) === step.contactId);
    if (c) {
      await deliver({ owner: patient._id, contact: c, monitoring: m, channel: 'call', kind: 'call', ...templates.callContact(patient) });
      log(m, 'call_contact', `Calling ${c.name}`);
    }
  }
};

// Process one monitoring session; returns true if it changed
const processOne = async (m, now = new Date()) => {
  let changed = false;

  if (m.endsAt && now >= m.endsAt) {
    const ci = openCheckIn(m);
    if (!ci || !ci.alertSentAt) { // finish, unless an alert is in progress
      m.status = 'completed';
      log(m, 'completed', 'Monitoring period finished');
      return true;
    }
  }

  let ci = openCheckIn(m);
  if (!ci && now >= m.nextCheckInAt) {
    m.checkIns.push({ sentAt: now, stepsDone: [] });
    ci = m.checkIns[m.checkIns.length - 1];
    m.nextCheckInAt = nextCheckIn(m, now);
    changed = true;
  }
  if (!ci || ci.acknowledgedAt) return changed;

  const contacts = await agreedContacts(m.user);
  const plan = escalationPlan(m, contacts);
  const elapsed = minutesBetween(m, ci.sentAt, now);
  const due = plan.filter((s) => s.at <= elapsed && !ci.stepsDone.some((d) => d.key === s.key));
  if (!due.length) return changed;

  const patient = await User.findById(m.user).select('name');
  for (const step of due) await runStep(m, ci, step, patient, contacts);
  return true;
};

let ticking = false;
const tick = async () => {
  if (ticking) return; // never overlap
  ticking = true;
  try {
    const now = new Date();
    const sessions = await Monitoring.find({ status: 'active' }).select('_id user');
    for (const s of sessions) {
      try {
        await userLock(s.user, async () => {
          // Re-read inside the lock so we always work on the latest version
          const m = await Monitoring.findById(s._id);
          if (m && m.status === 'active' && await processOne(m, now)) await m.save();
        });
      } catch (err) {
        console.error(`Monitoring ${s._id} tick failed:`, err.message);
      }
    }
  } catch (err) {
    console.error('Monitoring tick failed:', err.message);
  } finally {
    ticking = false;
  }
};

const startScheduler = () => {
  setInterval(tick, TICK_MS).unref();
  console.log('Nura Check-In scheduler running');
};

// ── Patient actions ───────────────────────────────────────────────────────
const setLocation = (m, location) => {
  if (location && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng))) {
    m.lastLocation = { lat: Number(location.lat), lng: Number(location.lng), at: new Date() };
  }
};

// If contacts were already alerted, tell them the patient is OK now
const sendAllClear = async (m, ci, patient) => {
  if (!ci || !ci.alertSentAt) return;
  const contacts = await agreedContacts(m.user);
  for (const c of contacts) await deliver({ owner: patient._id, contact: c, monitoring: m, kind: 'all_clear', ...templates.allClear(patient) });
  log(m, 'all_clear', 'Contacts told that you are OK');
};

const answer = async (m, checkInId, value, patient, location) => {
  setLocation(m, location);
  const ci = m.checkIns.id(checkInId) || openCheckIn(m);
  if (!ci) return { ci: null };
  if (!ci.answeredAt) {
    ci.answeredAt = new Date();
    ci.answer = value;
  }
  log(m, 'answered', `Answered "${value}"`);
  if (value === 'help') {
    const contacts = await agreedContacts(m.user);
    for (const c of contacts) await deliver({ owner: patient._id, contact: c, monitoring: m, kind: 'help', ...templates.help(patient, m) });
    ci.alertSentAt = ci.alertSentAt || new Date();
    log(m, 'help', contacts.length ? `"Need help" sent to ${contacts.map((c) => c.name).join(', ')}` : 'Need help pressed (no agreed contacts)');
  } else {
    await sendAllClear(m, ci, patient);
  }
  return { ci };
};

const contactReply = async (contact, text, patient) => {
  const t = String(text || '').trim().toUpperCase();
  await OutboundMessage.create({
    owner: patient._id, contact: contact._id, direction: 'in', channel: 'sms', kind: 'reply', to: 'MediGuide', body: t, delivery: 'demo'
  });
  if (contact.consent === 'pending' && (t === 'YES' || t === 'NO')) {
    contact.consent = t === 'YES' ? 'agreed' : 'declined';
    contact.respondedAt = new Date();
    await contact.save();
    await deliver({ owner: patient._id, contact, kind: 'consent_reply', ...(t === 'YES' ? templates.consentThanks(patient) : templates.consentDeclined()) });
    return { consent: contact.consent };
  }
  if (t === 'OK') {
    // Contact confirms they reached the patient: stop calling them / the others
    const m = await Monitoring.findOne({ user: patient._id, status: 'active' });
    const ci = m && [...m.checkIns].reverse().find((x) => x.alertSentAt && !x.acknowledgedAt);
    if (m && ci) {
      ci.acknowledgedAt = new Date();
      ci.acknowledgedBy = contact.name;
      log(m, 'acknowledged', `${contact.name} confirmed they reached you`);
      await m.save();
      await deliver({ owner: patient._id, contact, monitoring: m, kind: 'ack_reply', body: `Thank you, ${contact.name}. We've stopped the alerts.` });
      return { acknowledged: true };
    }
  }
  return {};
};

// ── Shape for the client ──────────────────────────────────────────────────
const serialize = async (m) => {
  if (!m) return null;
  const contacts = await CareContact.find({ owner: m.user }).sort({ order: 1, createdAt: 1 });
  const agreed = contacts.filter((c) => c.consent === 'agreed');
  const ci = openCheckIn(m) || (() => {
    const last = m.checkIns[m.checkIns.length - 1];
    return last && last.alertSentAt && !last.acknowledgedAt && last.answer === 'help' ? last : null;
  })();
  const now = new Date();
  let open = null;
  if (ci) {
    const plan = escalationPlan(m, agreed);
    const elapsed = minutesBetween(m, ci.sentAt, now);
    const done = (key) => ci.stepsDone.find((d) => d.key === key);
    const currentIdx = plan.findIndex((s) => !done(s.key));
    open = {
      id: String(ci._id),
      sentAt: ci.sentAt,
      answered: Boolean(ci.answeredAt),
      answer: ci.answer,
      minutesWaiting: Math.max(0, Math.floor(elapsed)),
      alertSent: Boolean(ci.alertSentAt),
      acknowledgedBy: ci.acknowledgedBy || '',
      steps: plan.map((s, i) => ({
        key: s.key,
        label: s.label,
        detail: s.detail || '',
        at: after(m, s.at, ci.sentAt),
        doneAt: done(s.key) ? done(s.key).at : null,
        // done = already carried out; current = the next step Nura will take; upcoming = later
        status: done(s.key) ? 'done' : (i === currentIdx ? 'current' : 'upcoming')
      }))
    };
  }
  return {
    id: String(m._id),
    status: m.status,
    reason: m.reason,
    intervalMin: m.intervalMin,
    alertAfterMin: m.alertAfterMin,
    durationMin: m.durationMin,
    overnight: m.overnight,
    demoSpeed: m.demoSpeed,
    unitMs: unitMs(m),
    startedAt: m.startedAt,
    endsAt: m.endsAt,
    nextCheckInAt: m.nextCheckInAt,
    checkInNumber: m.checkIns.length,
    totalCheckIns: m.durationMin ? Math.max(1, Math.floor(m.durationMin / m.intervalMin)) : null,
    openCheckIn: open,
    history: m.checkIns.filter((c) => c.answeredAt).slice(-12).reverse().map((c) => ({ id: String(c._id), sentAt: c.sentAt, answeredAt: c.answeredAt, answer: c.answer })),
    events: m.events.slice(-30).reverse(),
    lastLocation: m.lastLocation && m.lastLocation.at ? m.lastLocation : null,
    contacts: contacts.map(contactToClient)
  };
};

const contactToClient = (c) => ({
  id: String(c._id), name: c.name, phone: c.phone, relationship: c.relationship, consent: c.consent, invitedAt: c.invitedAt, respondedAt: c.respondedAt
});

module.exports = {
  startScheduler, tick, userLock, processOne, nextCheckIn, after, sendConsent, answer, contactReply, sendAllClear,
  setLocation, openCheckIn, serialize, contactToClient, log, templates
};
