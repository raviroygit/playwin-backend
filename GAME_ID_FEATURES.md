# Game ID Features Implementation

## Overview
This implementation adds automatic Game ID generation, phone validation, and enhanced login capabilities to the Playwin system.

## Features

### 1. Automatic Game ID Generation
- **Format**: `{First4LettersOfName}{Last5DigitsOfPhone}`
- **Example**: User "Ravi Roy" with phone "9876543210" → Game ID "RAVI43210"
- **Rules**:
  - Name part: First 4 letters (uppercase, no spaces)
  - Phone part: Last 5 digits
  - Auto-generated on user creation
  - Unique constraint enforced

### 2. Phone Number Validation
- **Format**: Indian mobile numbers only
- **Pattern**: `^(\+91)?[6-9]\d{9}$`
- **Examples**:
  - ✅ `9876543210`
  - ✅ `+919876543210`
  - ❌ `1234567890` (invalid prefix)
  - ❌ `987654321` (too short)

### 3. Enhanced Login System
- **Dual Login**: Users can login with either:
  - Email address
  - Game ID
- **Case Insensitive**: Email is converted to lowercase
- **Case Sensitive**: Game ID is converted to uppercase

## Database Changes

### User Model Updates
```typescript
interface IUser {
  // ... existing fields
  gameId: string; // NEW: Auto-generated unique identifier
  // ... other fields
}
```

### Validation Rules
- `fullName`: Minimum 2 characters
- `email`: Valid email format, unique, lowercase
- `phone`: Valid Indian mobile number, unique
- `gameId`: Auto-generated, unique, uppercase

## API Changes

### Authentication Endpoint
**POST** `/api/login`
```json
{
  "identifier": "user@email.com" | "RAVI43210",
  "password": "password123"
}
```

**Response**:
```json
{
  "token": "jwt_token",
  "mustChangePassword": false,
  "user": {
    "id": "user_id",
    "fullName": "Ravi Roy",
    "email": "user@email.com",
    "gameId": "RAVI43210",
    "role": "user"
  }
}
```

### User Management
- **Create User**: Automatically generates gameId
- **Update User**: Regenerates gameId if phone/name changes
- **Validation**: Enhanced phone validation with detailed error messages

## Migration

### For Existing Users
Run the migration script to add gameId to existing users:

```bash
npm run migrate:gameId
```

This script will:
1. Find all users without gameId
2. Generate gameId using their name and phone
3. Check for conflicts
4. Update the database

## Frontend Updates

### Login Modal
- **Label**: "Email or Game ID"
- **Placeholder**: "Enter your email or game ID"
- **Validation**: Accepts both formats

### Users Table
- **New Column**: Game ID (displayed as chip)
- **Enhanced Validation**: Better error messages
- **Phone Validation**: Real-time validation feedback

## Usage Examples

### Creating a New User
```javascript
// Backend automatically generates gameId
const user = await User.create({
  fullName: "Ravi Roy",
  email: "ravi@example.com",
  phone: "9876543210",
  password: "password123",
  role: "user"
});
// Result: gameId = "RAVI43210"
```

### User Login
```javascript
// Login with email
await login({ identifier: "ravi@example.com", password: "password123" });

// Login with gameId
await login({ identifier: "RAVI43210", password: "password123" });
```

## Error Handling

### Common Error Messages
- **Phone Validation**: "Phone number must be a valid Indian mobile number"
- **Game ID Conflict**: "Game ID already exists. Please try a different name or phone number."
- **Login**: "Invalid credentials" (for both email and gameId attempts)

### Validation Errors
- **Name**: "Full name must be at least 2 characters"
- **Email**: "Invalid email format"
- **Phone**: "Phone number must be a valid Indian mobile number"
- **Password**: "Password must be at least 6 characters"

## Security Considerations

1. **Game ID Uniqueness**: Enforced at database level
2. **Phone Validation**: Prevents invalid phone numbers
3. **Case Handling**: Consistent case conversion for login
4. **Error Messages**: Generic messages for security

## Testing

### Test Cases
1. **Game ID Generation**:
   - "John Doe" + "9876543210" → "JOHN43210"
   - "Mary Jane Smith" + "8765432109" → "MARY2109"

2. **Phone Validation**:
   - Valid: "9876543210", "+919876543210"
   - Invalid: "1234567890", "987654321"

3. **Login Scenarios**:
   - Email login (existing)
   - Game ID login (new)
   - Invalid credentials
   - Case sensitivity

## Future Enhancements

1. **Game ID Customization**: Allow admin to set custom game IDs
2. **Phone Verification**: SMS verification for phone numbers
3. **Game ID History**: Track game ID changes
4. **Bulk Operations**: Mass game ID generation for existing users 