# Authentication Fix - Supabase Auth Implementation

## Problem Summary
- ❌ 400 Bad Request error: `POST https://ievdekuapysvmiuiadum.supabase.co/rest/v1/workers?select=*`
- ❌ Login trying to filter by password directly in query (invalid Supabase operation)
- ❌ Plain-text passwords stored in database
- ❌ No proper user authentication mechanism

## Root Cause
The original implementation was trying to:
1. Filter workers by password using `.eq('password', password)` - This causes 400 errors
2. Store passwords in plaintext in the database
3. Use manual authentication instead of Supabase Auth

## Solution: Use Supabase Auth

### What Changed

#### 1. Login Component (`components/Login.tsx`)
**Before:**
```typescript
const { data: workerData } = await supabase.from('workers')
  .select('id, role, type, fullname, username')
  .or(`username.eq."${identifier}",email.eq."${identifier}"`)
  .eq('password', password)  // ❌ This caused 400 error
  .maybeSingle();
```

**After:**
```typescript
// Use Supabase Auth for authentication
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: authEmail,
  password: password
});

// Then fetch worker data for role info
const { data: workerData } = await supabase
  .from('workers')
  .select('id, role, type, fullname, username')
  .eq('email', authEmail)
  .maybeSingle();
```

#### 2. Admin Setup (`components/Login.tsx`)
**Before:**
```typescript
// Stored password directly in database
const { error: insertError } = await supabase.from('workers').insert({
  password: adminForm.password,  // ❌ Plaintext password
  // ... other fields
});
```

**After:**
```typescript
// Create Supabase Auth user first
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: adminForm.email,
  password: adminForm.password,
  options: {
    data: { full_name: adminForm.fullName }
  }
});

// Then create worker profile linked to auth user
const { error: insertError } = await supabase.from('workers').insert({
  id: authData.user.id,  // Link to auth user
  email: adminForm.email,
  // ... no password stored
});
```

#### 3. App Component (`App.tsx`)
**Before:**
```typescript
const { data: profile } = await supabase.from('profiles').select('role')
```

**After:**
```typescript
const { data: worker } = await supabase.from('workers')
  .select('role, fullname')
  .eq('id', session.user.id)  // Use auth session ID
```

### How to Implement

#### Step 1: Run the SQL Migration
Execute the [FIX_AUTH_SETUP.sql](FIX_AUTH_SETUP.sql) file in your Supabase SQL editor:
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Paste the contents of `FIX_AUTH_SETUP.sql`
4. Click "Run"

This will:
- Remove password column from workers table
- Link workers table to auth.users via ID
- Create trigger for automatic worker creation
- Set up proper RLS policies

#### Step 2: Verify the Setup
Check that:
1. Workers table has UUID id column as primary key
2. Workers table has `id` foreign key to `auth.users(id)`
3. Password column is removed
4. Trigger `on_auth_user_created` exists
5. RLS policies are in place

#### Step 3: Test the Authentication

**Create First Admin Account:**
1. Go to login page
2. Click "Setup Admin"
3. Fill in all fields
4. Click "Create Admin Account"
5. System will create both auth user and worker record

**Test Login:**
1. Use the email/password you just created
2. You should be logged in with admin role

### Database Schema After Fix

```sql
workers table structure:
- id (UUID) - PRIMARY KEY, FOREIGN KEY to auth.users(id)
- email (VARCHAR)
- username (VARCHAR)
- fullname (VARCHAR)
- role (VARCHAR) - 'admin' or 'worker'
- type (VARCHAR)
- amount (DECIMAL)
- payment_type (VARCHAR)
- phone (VARCHAR)
- address (TEXT)
- permissions (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Authentication Flow

1. **User clicks Login:**
   - Enters username/email + password
   - App calls `supabase.auth.signInWithPassword()`
   - Supabase authenticates user against auth.users table

2. **After successful auth:**
   - App fetches worker record using authenticated user ID
   - Gets role and other info from workers table
   - Sets session and local storage
   - Redirects to dashboard

3. **App initializes:**
   - Checks for Supabase session
   - If session exists, fetches worker data
   - Sets role and displays appropriate interface

4. **User logs out:**
   - Calls `supabase.auth.signOut()`
   - Clears session and local storage
   - Redirects to login

### Security Features

✅ Passwords encrypted by Supabase Auth (never stored as plaintext)
✅ Session management via JWT tokens
✅ RLS policies on workers table
✅ User can only see/modify their own profile
✅ Admins can manage all workers
✅ Automatic worker record creation on signup

### Troubleshooting

**Problem: "Invalid username or password" on login**
- Solution: Make sure email matches between auth.users and workers table
- Check: Use admin console to verify user exists in auth.users

**Problem: Worker profile not found**
- Solution: Run the migration script to ensure trigger is set up
- Check: New sign-ups should automatically create worker records

**Problem: Still seeing 400 errors**
- Solution: Clear browser cache and refresh
- Check: Ensure no password filtering in queries

**Problem: Can't create new admin account**
- Solution: Check if email already exists in auth.users
- Try: Use a different email address

### Files Modified

1. ✅ [components/Login.tsx](components/Login.tsx) - Fixed authentication logic
2. ✅ [App.tsx](App.tsx) - Fixed session management
3. ✅ [FIX_AUTH_SETUP.sql](FIX_AUTH_SETUP.sql) - Database migration

### Next Steps

1. Review [FIX_AUTH_SETUP.sql](FIX_AUTH_SETUP.sql) carefully
2. Run migration in Supabase
3. Test admin account creation
4. Test login with new credentials
5. Verify worker data syncs correctly
6. Deploy updated code

### Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JS Client Auth](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
