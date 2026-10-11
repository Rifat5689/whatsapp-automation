# Rifat Backend Coding Style

This document defines the standard backend coding conventions, architectural patterns, and structural choices based on my existing projects. AI agents MUST use this as the primary source of truth when working on or creating backend projects for me.

## 1. Core Principles

- **Feature-Based Modularity**: Group files by feature (e.g., User, Product) rather than technical role (e.g., all controllers together).
- **Fat Controllers, Smart Models**: Business logic is primarily placed in Controllers, while database-level operations and data-specific methods (like token generation or password comparison) belong in Mongoose Models.
- **Consistent Error & Response Handling**: ALL API responses and errors MUST use custom global wrapper classes (`ApiResponse` and `ApiError`).
- **Fail Fast**: Validate inputs at the beginning of controller functions and throw `ApiError` immediately if validation fails.
- **No Try/Catch in Controllers**: Use a custom `asyncHandler` to wrap controller functions and pass errors to the global error middleware automatically.

## 2. Technology Stack

**Required Technologies:**
- Node.js (ESM - ECMAScript Modules)
- Express.js (v5.x)
- Mongoose (MongoDB ODM)
- dotenv (Environment variables)

**Preferred Technologies:**
- `bcryptjs` (Password hashing)
- `jsonwebtoken` (Authentication)
- `cookie-parser` (Cookie parsing for JWTs)
- `cors`, `helmet` (Security middlewares)
- `multer`, `cloudinary` (File uploads)

**Technologies to Avoid (Unless explicitly requested):**
- CommonJS (`require()`). ALWAYS use `import`/`export`.
- Passport.js (Use custom JWT middleware instead).

## 3. Project Structure

The project MUST follow this feature-based folder structure:

```text
server/
├── .env                  # Environment variables
├── package.json          # Must set "type": "module"
├── server.js             # Entry point: loads env, connects DB, starts app
└── src/
    ├── app.js            # Express app setup, global middlewares, route assembly
    ├── config/           # Configuration files
    │   └── db.js         # Mongoose connection logic
    ├── middlewares/      # Global Express middlewares
    │   ├── auth.middleware.js
    │   └── multer.middleware.js
    ├── modules/          # FEATURE MODULES (Core Business Logic)
    │   ├── user/         # Example feature folder
    │   │   ├── user.controller.js
    │   │   ├── user.model.js
    │   │   ├── user.routes.js
    │   │   └── user.utils.js
    │   └── product/
    ├── services/         # Third-party or Global external services
    │   ├── cloudinary.service.js
    │   └── slug.service.js
    └── utils/            # Global Utilities & Helpers
        ├── ApiError.js
        ├── ApiResponse.js
        └── asyncHandler.js
```

## 4. File Naming

- **Folders**: lowercase, singular (e.g., `user`, `product`, `category`).
- **Feature Files**: `{feature}.{type}.js` (e.g., `user.controller.js`, `product.model.js`).
- **Classes/Utility Classes**: PascalCase (e.g., `ApiError.js`, `ApiResponse.js`).
- **Helper Functions**: camelCase (e.g., `asyncHandler.js`, `uploadImages.js`).
- **Variables/Functions**: camelCase (e.g., `createProduct`, `getAllProducts`).
- **Models**: PascalCase (e.g., `User`, `Product`).

## 5. Application Architecture

Request flow MUST follow this path:
`Request` → `Express App (app.js)` → `Feature Route (*.routes.js)` → `Middleware` → `Controller (*.controller.js)` → `Model (*.model.js)` → `Database`

**Important Note**: I DO NOT use a dedicated "Service Layer" for feature business logic (i.e., no `user.service.js`). Business logic lives in the controller, and reusable logic within a feature lives in `user.utils.js`. The `src/services` folder is strictly for external, third-party integrations (like Cloudinary) or global transformations (like slugs).

## 6. Routes

- Routes belong in `{feature}.routes.js`.
- Use Express `Router()`.
- Chain HTTP methods using `.route()`.
- Prefix route assemblies in `app.js` with `/api/v1/` (e.g., `/api/v1/users`).

**Example:**
```javascript
import { Router } from "express";
import { register, logIn, logOut } from "./user.controller.js";
import { verifyJwt } from "../../middlewares/auth.middleware.js";

const router = Router();

router.route("/auth/register").post(register);
router.route("/auth/login").post(logIn);
router.route("/auth/logout").post(verifyJwt, logOut); // Middleware placement

export { router };
```

## 7. Controllers

Controllers MUST:
1. Be wrapped in `asyncHandler`.
2. Extract required data from `req.body` or `req.params`.
3. Validate manually and throw `ApiError` on failure.
4. Perform DB operations via Mongoose Models.
5. Return responses using `ApiResponse`.

**Example:**
```javascript
import ApiError from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import Product from "./product.model.js";

const getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) throw new ApiError(400, "Product ID is required");

    const product = await Product.findById(id);
    if (!product) throw new ApiError(404, "Product not found");

    return res.status(200).json(
        new ApiResponse(200, product, "Product fetched successfully")
    );
});

export { getProductById };
```

## 8. Services

- **DO NOT** create a service file for feature business logic.
- **DO** create service files in `src/services/` for external integrations (e.g., `cloudinary.service.js`, `stripe.service.js`) or global abstract logic.

## 9. Models & Mongoose

- Place models in `{feature}.model.js`.
- ALWAYS include `{ timestamps: true }` in the schema options.
- Use Mongoose `pre('save')` hooks for data transformation (e.g., hashing passwords).
- Add custom methods using `schema.methods` for data-specific logic (e.g., `generateAccessToken`, `isPasswordCorrect`).

**Example:**
```javascript
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    }
}, { timestamps: true });

const Category = mongoose.model("Category", categorySchema);
export default Category;
```

## 10. API Response Format

ALL successful responses MUST use the `ApiResponse` class.

**Format Pattern:**
```json
{
  "statusCode": 200,
  "data": { ... },
  "message": "Product fetched successfully",
  "success": true
}
```

## 11. Error Handling

- **DO NOT** use `try/catch` in controllers. Let `asyncHandler` catch errors.
- Throw custom `ApiError` for known errors.
- A global error handling middleware in `app.js` formats the response.

**Format Pattern:**
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Product not found",
  "errors": []
}
```

## 12. Validation

- Currently, manual validation is performed at the top of the controller function.
- DO NOT introduce heavy validation libraries (like Joi or Zod) unless explicitly requested.
- Use simple `if (!field) throw new ApiError(400, "message");`.

## 13. Authentication

- Use JWT (JSON Web Tokens).
- Tokens are stored in **HTTP-only Cookies** AND accepted via the `Authorization` header (`Bearer token`).
- Implement an Access Token + Refresh Token architecture.
- Token generation logic belongs in the User Model (`generateAccessToken`, `generateRefreshToken`).
- Clear cookies on logout.

## 14. Authorization

- Implemented via a `role` field on the User schema (e.g., `enum: ['user', 'admin']`).
- Authentication middleware (`verifyJwt`) extracts the user and attaches it to `req.user`.

## 15. Database Patterns

- **Create**: `Model.create({ ... })`
- **Read**: `Model.find()`, `Model.findOne()`, `Model.findById()`
- **Update**: `Model.findByIdAndUpdate(id, data, { new: true, runValidators: true })`
- **Delete**: `Model.findByIdAndDelete(id)`
- **Pagination**: Use `skip(skip).limit(limit)`. Use a utility function (e.g., `getPagination`) to calculate these from request query params.

## 16. Middleware

- Global middlewares (Cors, Helmet, Body parsing) belong in `app.js`.
- Reusable custom middlewares (Auth verification, Multer uploads) belong in `src/middlewares/`.
- Middlewares must pass control using `next()` or throw `ApiError`.

## 17. Utilities & Helpers

- **`src/utils/`**: Use for global utilities used across the entire app (e.g., `ApiError`, `ApiResponse`, `asyncHandler`).
- **`src/modules/{feature}/{feature}.utils.js`**: Use for feature-specific helpers (e.g., formatting data specific to a user, calculating user stats).

## 18. Environment & Configuration

- Load `dotenv` in `server.js` at the very top.
- Isolate database connection logic in `src/config/db.js`.
- Use `process.env` to access variables.

## 19. Security Patterns

- Use `helmet` for HTTP headers.
- Configure `cors` with specific `allowedOrigins` and `credentials: true`.
- DO NOT send stack traces in the error response in production.
- Use `bcryptjs` for secure password hashing.

## 20. Code Style

- Use ECMAScript Modules (`import`/`export`).
- Use arrow functions for controllers and middlewares.
- Prefer `const` over `let`.
- Return HTTP responses (e.g., `return res.status(200)...`) to prevent double execution.
- Maintain a clean export style: `export { fn1, fn2 }` at the bottom of the file.

## 21. What NOT To Do (Strict Rules)

- **DO NOT** use `require()` or `module.exports`.
- **DO NOT** write raw `res.send()` or `res.json()`. ALWAYS use `new ApiResponse()`.
- **DO NOT** write `try/catch` in your controllers. ALWAYS wrap with `asyncHandler`.
- **DO NOT** create a dedicated Service Layer (`*.service.js`) inside feature modules. Keep business logic in the controller.
- **DO NOT** put global middleware definitions inside the `server.js` file; they belong in `app.js`.
- **DO NOT** create complex schema structures before verifying requirements; stick to flat, simple schemas with refs where necessary.

## 22. Decision Rules for AI Agents

- **When creating a new entity** → Create a folder inside `src/modules/{entityName}` and generate `.controller.js`, `.model.js`, and `.routes.js` files.
- **When writing business logic** → Place it directly in the controller.
- **When abstracting feature-specific reusable code** → Place it in `{feature}.utils.js`.
- **When abstracting global external APIs** → Place it in `src/services/{apiName}.service.js`.
- **When throwing an error** → Throw `new ApiError(statusCode, "Message")`. DO NOT use `throw new Error()`.
- **When sending a success response** → `return res.status(code).json(new ApiResponse(code, data, "Message"))`.
