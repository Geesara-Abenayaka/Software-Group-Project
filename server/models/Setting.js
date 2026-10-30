import mongoose from 'mongoose';

// One document per setting, e.g. { key: 'assistant-facts', value: '...' }.
const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);

export default Setting;
