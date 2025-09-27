# ReMoodle Mini API Usage

This document describes how to use the ReMoodle Mini API for managing Moodle sessions and user data.

## API Endpoints

### 1. Health Check

**GET** `/api/health`

Returns the health status of the API server.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Moodle Session Management

**POST** `/api/moodle/session`

Accepts a MoodleSession cookie and user information to create or update a user account.

**Request Body:**

```json
{
  "moodleSession": "your_moodle_session_cookie_here",
  "userInfo": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Response (New User - 201):**

```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid-here",
    "name": "John Doe",
    "moodleId": 12345
  }
}
```

**Response (Existing User - 200):**

```json
{
  "message": "User updated successfully",
  "user": {
    "id": "uuid-here",
    "name": "John Doe",
    "moodleId": 12345
  }
}
```

**Error Responses:**

- `400`: Missing MoodleSession cookie
- `401`: Invalid Moodle session
- `500`: Server error

## Usage Examples

### Using curl

```bash
# Health check
curl -X GET http://localhost:3001/api/health

# Submit Moodle session
curl -X POST http://localhost:3001/api/moodle/session \
  -H "Content-Type: application/json" \
  -d '{
    "moodleSession": "your_session_cookie_here",
    "userInfo": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }'
```

### Using JavaScript/Fetch

```javascript
// Health check
const healthResponse = await fetch("http://localhost:3001/api/health");
const healthData = await healthResponse.json();
console.log(healthData);

// Submit Moodle session
const sessionResponse = await fetch(
  "http://localhost:3001/api/moodle/session",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      moodleSession: "your_session_cookie_here",
      userInfo: {
        name: "John Doe",
        email: "john@example.com",
      },
    }),
  },
);

const sessionData = await sessionResponse.json();
console.log(sessionData);
```

## How It Works

1. **Session Validation**: The API validates the MoodleSession cookie by making a test request to the Moodle API
2. **User Lookup**: It checks if a user with the same Moodle ID already exists
3. **User Management**:
   - If user exists: Updates the session token and user info
   - If user doesn't exist: Creates a new user with the provided information
4. **Background Processing**: The session extender worker automatically extends all active sessions every 5 minutes

## Session Extension

The system includes an automatic session extender that:

- Runs every 5 minutes
- Extends sessions for all users with valid MoodleSession cookies
- Logs successful and failed extension attempts
- Helps maintain active sessions without user intervention

## Error Handling

The API includes comprehensive error handling:

- Invalid sessions are rejected with appropriate error messages
- Database errors are logged and return generic error responses
- All requests include proper CORS headers for web applications

## Security Notes

- The API validates MoodleSession cookies against the actual Moodle instance
- Session tokens are stored securely in the database
- CORS is enabled for cross-origin requests
- All operations are logged for debugging and monitoring
