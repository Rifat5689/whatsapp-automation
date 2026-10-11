import mongoose from 'mongoose';

const appStateSchema = new mongoose.Schema({
  ownerId: { type: String, required: true, unique: true, index: true },
  state: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true, minimize: false });

const AppState = mongoose.models.AppState || mongoose.model('AppState', appStateSchema);

export default AppState;
