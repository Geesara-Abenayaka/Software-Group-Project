import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendBulkEmail } from '../utils/emailService.js';

const router = express.Router();
const ADMIN_RECOVERY_EMAIL = 'admin@uom.lk';

const isBcryptHash = (value) => typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);

const verifyPassword = async (plainPassword, storedPassword) => {
  if (!storedPassword) {
    return false;
  }

  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(plainPassword, storedPassword);
  }

  return plainPassword === storedPassword;
};

const validateNewPassword = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    return 'New password must be at least 8 characters long.';
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return 'New password must include uppercase, lowercase, and a number.';
  }

  return '';
};

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const passwordInput = String(password || '');

    if (!normalizedEmail || !passwordInput) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password using secure verification (with legacy plain-text compatibility).
    const isValidPassword = await verifyPassword(passwordInput, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Upgrade legacy plain-text passwords to bcrypt hash after successful login.
    if (!isBcryptHash(user.password)) {
      user.password = await bcrypt.hash(password, 10);
      await user.save();
    }

    // Return user data
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password route (admin only)
router.post('/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'userId, currentPassword and newPassword are required.' });
    }

    const validationError = validateNewPassword(newPassword);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin users can change password here.' });
    }

    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const isSameAsCurrent = await verifyPassword(newPassword, user.password);
    if (isSameAsCurrent) {
      return res.status(400).json({ message: 'New password must be different from current password.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    if (normalizedEmail !== ADMIN_RECOVERY_EMAIL) {
      return res.status(400).json({ message: 'Only admin email can reset password here.' });
    }

    const user = await User.findOne({ email: normalizedEmail, role: 'admin' });

    if (user) {
      const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
      const hashedToken = crypto.createHash('sha256').update(verificationCode).digest('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      user.passwordResetToken = hashedToken;
      user.passwordResetExpiresAt = expiresAt;
      await user.save();

      const emailContent = [
        `Hello ${user.name || 'Admin'},`,
        '',
        'We received a request to reset your admin password.',
        `Your verification code: ${verificationCode}`,
        '',
        'This code expires in 10 minutes.',
        'If you did not request this, you can ignore this email.'
      ].join('\n');

      try {
        await sendBulkEmail({
          recipients: [{
            email: normalizedEmail,
            fullName: user.name,
            applicationId: user._id?.toString()
          }],
          subject: 'Admin Password Reset',
          content: emailContent,
          programName: ''
        });
      } catch (emailError) {
        console.error('Forgot password email error:', emailError);
      }
    }

    return res.json({
      message: 'If that admin email exists, a verification code has been sent.'
    });
  } catch (error) {
    console.error('Forgot password route error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { code, email, newPassword } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!code || !normalizedEmail || !newPassword) {
      return res.status(400).json({ message: 'code, email and newPassword are required.' });
    }

    if (normalizedEmail !== ADMIN_RECOVERY_EMAIL) {
      return res.status(400).json({ message: 'Only admin email can reset password here.' });
    }

    const validationError = validateNewPassword(newPassword);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const hashedToken = crypto.createHash('sha256').update(String(code)).digest('hex');

    const user = await User.findOne({
      email: normalizedEmail,
      role: 'admin',
      passwordResetToken: hashedToken,
      passwordResetExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    return res.json({ message: 'Password reset successful.' });
  } catch (error) {
    console.error('Reset password route error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
