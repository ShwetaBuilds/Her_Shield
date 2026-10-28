# Her Shield - API Documentation

> This reference describes the existing Express API. The API requires MongoDB Atlas and a valid bearer token for user data routes. `/api/health` is a database readiness check. SOS requests are stored as account records only; they do not contact trusted contacts or emergency services. Password reset is not configured.

## Base URL
```
http://localhost:5000/api
```

---

## Authentication Endpoints

### 1. Sign Up (Create Account)

**Endpoint:** `POST /auth/signup`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890"
}
```

**Success Response (201 Created):**
```json
{
  "message": "Signup successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890"
  }
}
```

**Error Responses:**
```json
// Missing required field
{ "message": "Name, email, and password are required" }

// Email already exists
{ "message": "Email already registered. Please login or use a different email." }

// Invalid email format
{ "message": "Valid email is required" }

// Password too short
{ "message": "Password must be at least 6 characters" }
```

**Frontend Usage:**
```typescript
import { authAPI } from './lib/api';

const response = await authAPI.signup({
  name: "John Doe",
  email: "john@example.com",
  password: "password123",
  phone: "1234567890"
});

const token = response.data.token;
localStorage.setItem("token", token);
```

---

### 2. Log In

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "profileImage": null
  }
}
```

**Error Responses:**
```json
// Missing fields
{ "message": "Email and password are required" }

// Invalid credentials
{ "message": "Invalid email or password" }
```

**Frontend Usage:**
```typescript
import { authAPI } from './lib/api';

const response = await authAPI.login(email, password);
const token = response.data.token;
localStorage.setItem("token", token);
```

---

### 3. Log Out

**Endpoint:** `POST /auth/logout`

**Request Body:** Empty

**Success Response (200 OK):**
```json
{
  "message": "Logout successful"
}
```

**Frontend Usage:**
```typescript
localStorage.removeItem("token");
window.location.href = "/login";
```

---

## User Endpoints (Requires JWT Token)

### Authentication Header
All user endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Note:** The frontend API client automatically adds this header via interceptors.

---

### 1. Get User Profile

**Endpoint:** `GET /users/profile`

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200 OK):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "age": 25,
  "gender": "Female",
  "bloodGroup": "O+",
  "address": "123 Main St",
  "profileImage": "http://example.com/image.jpg",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
```json
// Invalid token
{ "message": "Invalid token" }

// Token expired
{ "message": "Token expired" }

// Not authorized
{ "message": "Not authorized" }
```

**Frontend Usage:**
```typescript
import { usersAPI } from './lib/api';

const response = await usersAPI.getProfile();
const userData = response.data;
```

---

### 2. Update User Profile

**Endpoint:** `PUT /users/profile`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "phone": "9876543210",
  "age": 26,
  "gender": "Female",
  "bloodGroup": "AB+",
  "address": "456 Oak Ave",
  "profileImage": "data:image/jpeg;base64,..."
}
```

**Note:** All fields are optional. Send only the fields you want to update.

**Success Response (200 OK):**
```json
{
  "message": "Profile updated successfully"
}
```

**Error Responses:**
```json
// Invalid data
{ "message": "Invalid gender value" }

// Not authorized
{ "message": "Not authorized" }
```

**Frontend Usage:**
```typescript
import { usersAPI } from './lib/api';

const response = await usersAPI.updateProfile({
  name: "Jane Doe",
  phone: "9876543210"
});
```

---

### 3. Delete Account

**Endpoint:** `DELETE /users/delete`

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200 OK):**
```json
{
  "message": "Account deleted successfully"
}
```

**Note:** This permanently deletes the user account and all associated data.

---

### 4. Get Dashboard Data

**Endpoint:** `GET /users/dashboard`

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200 OK):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "profileImage": null
  },
  "emergencyContacts": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Jane Doe",
      "phone": "9876543210",
      "relation": "Sister",
      "priority": "1"
    }
  ],
  "sosHistory": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "status": "resolved",
      "triggeredAt": "2024-01-15T10:30:00Z"
    }
  ],
  "locationHistory": [],
  "notifications": [],
  "recentReports": []
}
```

---

## Error Handling

### Common HTTP Status Codes

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | OK | Successful GET/PUT |
| 201 | Created | Successful POST (signup) |
| 400 | Bad Request | Missing/invalid data |
| 401 | Unauthorized | Invalid/missing token |
| 403 | Forbidden | Email not verified (disabled) |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Email already exists |
| 500 | Server Error | Unexpected error |

### Error Response Format
```json
{
  "message": "Error description"
}
```

### Frontend Error Handling
```typescript
try {
  const response = await authAPI.login(email, password);
} catch (error) {
  if (error.response?.status === 401) {
    console.log("Invalid credentials");
  } else if (error.response?.status === 409) {
    console.log("Email already exists");
  } else {
    console.log(error.response?.data?.message);
  }
}
```

---

## JWT Token Details

### Token Structure
```
Header.Payload.Signature
```

### Payload Example
```json
{
  "id": "507f1f77bcf86cd799439011",
  "iat": 1705316400,
  "exp": 1705921200
}
```

- `id`: User ID
- `iat`: Issued at (timestamp)
- `exp`: Expires at (timestamp) - 7 days from issue

### Token Storage
```javascript
// Store token
localStorage.setItem("token", token);

// Retrieve token
const token = localStorage.getItem("token");

// Remove token
localStorage.removeItem("token");
```

---

## Request/Response Examples

### Example 1: Complete Sign Up Flow
```javascript
// 1. User signs up
const signupResponse = await fetch("http://localhost:5000/api/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "John Doe",
    email: "john@example.com",
    password: "password123",
    phone: "1234567890"
  })
});

const signupData = await signupResponse.json();
console.log(signupData.token); // eyJhbGc...

// 2. Store token
localStorage.setItem("token", signupData.token);

// 3. Use token for protected requests
const profileResponse = await fetch("http://localhost:5000/api/users/profile", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${signupData.token}`
  }
});

const profileData = await profileResponse.json();
console.log(profileData); // User info
```

### Example 2: Using API Client (Recommended)
```typescript
import { authAPI, usersAPI } from './lib/api';

// Sign up
const signupResponse = await authAPI.signup({
  name: "John Doe",
  email: "john@example.com",
  password: "password123",
  phone: "1234567890"
});

// Automatically stores token via interceptor
localStorage.setItem("token", signupResponse.data.token);

// Get profile (automatically adds Bearer token)
const profileResponse = await usersAPI.getProfile();
console.log(profileResponse.data);
```

---

## Rate Limiting
Currently not implemented. Can be added with `express-rate-limit`.

---

## Pagination
Not applicable for current endpoints. Future versions may support pagination for lists.

---

## Versioning
Current API version: **v1**

Base URL may change to: `http://localhost:5000/api/v1`

---

## Security Considerations

✅ **HTTPS in Production**: Always use HTTPS for live deployments
✅ **Token Expiration**: Tokens expire in 7 days
✅ **Password Requirements**: Minimum 6 characters (can be increased)
✅ **CORS**: Only frontend origin allowed
✅ **Input Validation**: All inputs are validated
✅ **Error Messages**: Avoid exposing sensitive information

---

## Postman Collection

You can import this into Postman for testing:

```json
{
  "info": {
    "name": "Her Shield API",
    "version": "1.0"
  },
  "item": [
    {
      "name": "Sign Up",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/auth/signup",
        "body": {
          "mode": "raw",
          "raw": "{\"name\":\"John\",\"email\":\"john@test.com\",\"password\":\"pass123\",\"phone\":\"123\"}"
        }
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/auth/login",
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"john@test.com\",\"password\":\"pass123\"}"
        }
      }
    },
    {
      "name": "Get Profile",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/users/profile",
        "header": {
          "Authorization": "Bearer {{token}}"
        }
      }
    }
  ]
}
```

**Postman Variables:**
- `base_url`: http://localhost:5000/api
- `token`: Your JWT token from signup/login response

---

## Troubleshooting API Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing/invalid token | Check token in localStorage |
| 404 Not Found | Wrong endpoint URL | Verify endpoint path |
| 500 Server Error | Backend crashed | Check backend logs |
| CORS Error | Frontend can't reach backend | Verify CORS config, backend running |
| Token expired | Token is too old | User needs to login again |

---

**For more details, see AUTHENTICATION_FIX_COMPLETE.md**
