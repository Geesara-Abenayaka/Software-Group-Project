import mongoose from 'mongoose';

// Course Advisor replies that admins can review: helpful / not helpful votes from users,
// and questions the AI could not answer from the programme data.
const assistantFeedbackSchema = new mongoose.Schema({
  // Chat message id from the browser, so changing a vote updates the same record.
  // Questions logged as unanswered have none.
  messageId: {
    type: String,
    unique: true,
    sparse: true
  },
  question: {
    type: String,
    default: ''
  },
  reply: {
    type: String,
    required: true
  },
  helpful: Boolean,
  unanswered: {
    type: Boolean,
    default: false
  },
  source: {
    type: String,
    enum: ['ai', 'fallback', 'quiz'],
    default: 'ai'
  },
  path: String
}, { timestamps: true });

assistantFeedbackSchema.index({ updatedAt: -1 });

const AssistantFeedback = mongoose.model('AssistantFeedback', assistantFeedbackSchema);

export default AssistantFeedback;
