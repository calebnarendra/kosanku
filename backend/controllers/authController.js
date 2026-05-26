const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function serialiseUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    age: user.age === null || user.age === undefined ? '' : String(user.age),
    gender: user.gender || '',
    profileImageUrl: user.profile_image_url || '',
    emailVerified: Boolean(user.email_verified),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

async function register(req, res, next) {
  try {
    const {
      name,
      email,
      password,
      role,
      phone = '',
      age = null,
      gender = '',
      profileImageUrl = '',
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    if (!['student', 'provider'].includes(role)) {
      return res.status(400).json({ error: 'Role must be student or provider' });
    }

    const normalisedEmail = String(email).trim().toLowerCase();
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [normalisedEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const parsedAge = age === '' || age === null || age === undefined ? null : Number(age);
    if (parsedAge !== null && (!Number.isInteger(parsedAge) || parsedAge < 0)) {
      return res.status(400).json({ error: 'Age must be a valid whole number' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, phone, age, gender, profile_image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, email, role, phone, age, gender, profile_image_url, email_verified, created_at, updated_at`,
      [
        String(name).trim(),
        normalisedEmail,
        hashedPassword,
        role,
        String(phone).trim() || null,
        parsedAge,
        String(gender).trim() || null,
        String(profileImageUrl).trim() || null,
      ]
    );

    return res.status(201).json({
      message: 'Account created successfully',
      user: serialiseUser(result.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [String(email).trim().toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: serialiseUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, phone, age, gender, profile_image_url, email_verified, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: serialiseUser(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const name = String(req.body.name || '').trim();
    const phone = String(req.body.phone || '').trim();
    const ageRaw = req.body.age;
    const gender = String(req.body.gender || '').trim();
    const profileImageUrl = String(req.body.profileImageUrl || req.body.profile_image_url || '').trim();

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const parsedAge = ageRaw === '' || ageRaw === null || ageRaw === undefined ? null : Number(ageRaw);
    if (parsedAge !== null && (!Number.isInteger(parsedAge) || parsedAge < 0)) {
      return res.status(400).json({ error: 'Age must be a valid whole number' });
    }

    const result = await pool.query(
      `UPDATE users
       SET name = $1,
           phone = $2,
           age = $3,
           gender = $4,
           profile_image_url = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, name, email, role, phone, age, gender, profile_image_url, email_verified, created_at, updated_at`,
      [
        name,
        phone || null,
        parsedAge,
        gender || null,
        profileImageUrl || null,
        req.user.id,
      ]
    );

    return res.json({
      message: 'Profile updated successfully',
      user: serialiseUser(result.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const currentPassword = String(req.body.currentPassword || '').trim();
    const newPassword = String(req.body.newPassword || '').trim();

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const result = await pool.query('SELECT id, password FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users
       SET password = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, req.user.id]
    );

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return next(error);
  }
}



async function requestEmailVerification(req, res, next) {
  try {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const result = await pool.query(
      `UPDATE users
       SET email_verification_code = $1,
           email_verification_requested_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, email, role, phone, age, gender, profile_image_url, email_verified, created_at, updated_at`,
      [code, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      message: 'Verification code sent to Admin Messages',
      code,
      user: serialiseUser(result.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
}

async function confirmEmailVerification(req, res, next) {
  try {
    const code = String(req.body.code || '').trim();
    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const userResult = await pool.query(
      `SELECT id, email_verification_code
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (String(userResult.rows[0].email_verification_code || '') !== code) {
      return res.status(400).json({ error: 'Verification code is incorrect' });
    }

    const result = await pool.query(
      `UPDATE users
       SET email_verified = true,
           email_verification_code = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, email, role, phone, age, gender, profile_image_url, email_verified, created_at, updated_at`,
      [req.user.id]
    );

    return res.json({
      message: 'Email is verified',
      user: serialiseUser(result.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteAccount(req, res, next) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query('SELECT id, role, name FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    await client.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    await client.query('COMMIT');

    return res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

module.exports = {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  requestEmailVerification,
  confirmEmailVerification,
  deleteAccount,
};
