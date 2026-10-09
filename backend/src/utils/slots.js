const Slot = require('../models/Slot');

const DEFAULT_TIMES = ['09:00', '11:00', '14:30', '16:00'];

// Sessions are stored as local clinic date + time strings, so "now" must be computed
// in the clinic's timezone, not UTC.
const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE || 'Asia/Karachi';

// YYYY-MM-DD for a moment, in the clinic timezone
const isoDate = (d) => new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit'
}).format(d);

// HH:mm (24h) for a moment, in the clinic timezone
const clockTime = (d) => new Intl.DateTimeFormat('en-GB', {
  timeZone: CLINIC_TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
}).format(d);

// Mongo filter matching sessions that have not started yet
const upcomingFilter = (now = new Date()) => {
  const today = isoDate(now);
  return { $or: [{ date: { $gt: today } }, { date: today, time: { $gt: clockTime(now) } }] };
};

// Create bookable sessions for the next `days` days for one doctor of an organisation.
// Safe to call repeatedly: the unique index skips sessions that already exist.
exports.generateSlotsForDoctor = async (org, doctor, { days = 7, times = DEFAULT_TIMES } = {}) => {
  const docs = [];
  const start = new Date();
  for (let i = 0; i < days; i++) {
    const day = new Date(start.getTime() + i * 86400000);
    for (const time of times) {
      docs.push({
        organization: org._id,
        orgName: org.name,
        doctor: doctor.name,
        specialty: doctor.specialty || 'General Physician',
        date: isoDate(day),
        time
      });
    }
  }
  try {
    await Slot.insertMany(docs, { ordered: false });
  } catch (err) {
    // Duplicate key errors (code 11000) just mean those sessions already exist
    if (err.code !== 11000 && !(err.writeErrors || []).every((e) => e.code === 11000)) throw err;
  }
};

exports.isoDate = isoDate;
exports.upcomingFilter = upcomingFilter;
