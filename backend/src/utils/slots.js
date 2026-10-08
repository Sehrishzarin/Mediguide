const Slot = require('../models/Slot');

const DEFAULT_TIMES = ['09:00', '11:00', '14:30', '16:00'];

const isoDate = (d) => d.toISOString().split('T')[0];

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
