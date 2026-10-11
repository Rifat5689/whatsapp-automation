import { Router } from 'express';
import { createContact, deleteContact, listContacts, updateContact } from '../controllers/contact.controller.js';
const router = Router();
router.route('/').get(listContacts).post(createContact);
router.route('/:id').patch(updateContact).delete(deleteContact);
export { router };
