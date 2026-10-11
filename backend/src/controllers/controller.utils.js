import { ApiResponse } from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { db } from '../store.js';

const respond = (res, data, statusCode = 200, message = 'Success') => res.status(statusCode).json(new ApiResponse(statusCode, data, message));
const ownedContact = (contactId) => db.contacts.find((item) => item.id === contactId && item.ownerId === db.ownerId);
const requireContact = (contactId) => { const contact = ownedContact(contactId); if (!contact) throw new ApiError(404, 'Contact not found'); return contact; };

export { respond, ownedContact, requireContact };
