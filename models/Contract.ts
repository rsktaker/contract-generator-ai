import mongoose from 'mongoose';

const ContractSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['service', 'nda', 'employment', 'lease', 'custom']
  },
  requirements: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  parties: [{
    name: String,
    email: String,
    role: String,
    signed: {
      type: Boolean,
      default: false
    },
    signatureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Signature'
    }
  }],
  status: {
    type: String,
    enum: ['generating', 'draft', 'pending', 'signed', 'completed'],
    default: 'draft'
  },
  // Additional metadata
  isAnonymous: {
    type: Boolean,
    default: false
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true  // This automatically adds createdAt and updatedAt
});

export default mongoose.models.Contract || mongoose.model('Contract', ContractSchema);