import { Router } from 'express';
import multer from 'multer';
import { createContact, deleteContact, importChatProfile, listContacts, updateContact } from '../controllers/contact.controller.js';
const router = Router();
const chatUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024, files: 1 } });
router.route('/').get(listContacts).post(createContact);
router.post('/:id/import-chat', chatUpload.single('chat'), importChatProfile);
router.route('/:id').patch(updateContact).delete(deleteContact);
export { router };
