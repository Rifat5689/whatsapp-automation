import mongoose from 'mongoose';
import AppState from '../models/app-state.model.js';
import { db } from '../store.js';

const isConnected = () => mongoose.connection.readyState === 1;

const loadState = async () => {
  if (!isConnected()) return false;
  const saved = await AppState.findOne({ ownerId: db.ownerId }).lean();
  if (saved?.state) Object.assign(db, saved.state, { ownerId: db.ownerId });
  else await saveState();
  return true;
};

const saveState = async () => {
  if (!isConnected()) return false;
  const state = structuredClone(db);
  await AppState.updateOne({ ownerId: db.ownerId }, { $set: { state } }, { upsert: true, runValidators: true });
  return true;
};

export { loadState, saveState };
