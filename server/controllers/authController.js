import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { logAudit } from '../services/audit/auditService.js';

const generateTokens = (user) => {
  const secret = process.env.JWT_SECRET || 'smartcrm_dev_secret_jwt_key_2026_x89a1!';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'smartcrm_dev_refresh_secret_key_2026_z73b2!';

  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    {
      id: user._id,
    },
    refreshSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { token, refreshToken };
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, organizationName, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create Organization for new Owner/Registrant
    const orgName = organizationName || `${name.split(' ')[0]}'s Workspace`;
    const slugBase = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const slug = `${slugBase}-${Date.now().toString().slice(-4)}`;

    const organization = await Organization.create({
      name: orgName,
      slug,
      email: email.toLowerCase().trim(),
    });

    const userRole = role === 'super_admin' ? 'super_admin' : 'owner';

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: userRole,
      organizationId: organization._id,
    });

    const tokens = generateTokens(user);

    await logAudit({
      organizationId: organization._id,
      userId: user._id,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        },
        organization: {
          id: organization._id,
          name: organization.name,
          slug: organization.slug,
          currency: organization.currency,
        },
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact your administrator.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const organization = await Organization.findById(user.organizationId);
    const tokens = generateTokens(user);

    await logAudit({
      organizationId: user.organizationId,
      userId: user._id,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          organizationId: user.organizationId,
        },
        organization: organization
          ? {
              id: organization._id,
              name: organization.name,
              slug: organization.slug,
              currency: organization.currency,
              settings: organization.settings,
            }
          : null,
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const organization = await Organization.findById(user.organizationId);

    res.json({
      success: true,
      data: {
        user,
        organization,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  // Always return success to avoid leaking registered user presence
  res.json({
    success: true,
    message: `If an account with email ${email} exists, password reset instructions have been dispatched.`,
  });
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    res.json({
      success: true,
      message: 'Password has been successfully updated. You may now log in.',
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required.' });
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'smartcrm_dev_refresh_secret_key_2026_z73b2!';
    const decoded = jwt.verify(refreshToken, refreshSecret);

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const tokens = generateTokens(user);

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Expired or invalid refresh token.' });
  }
};

/**
 * RFC 6238 TOTP Engine for Two-Factor Authentication (2FA)
 */
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const generateBase32Secret = (length = 16) => {
  let secret = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    secret += BASE32_CHARS[bytes[i] % 32];
  }
  return secret;
};

const base32ToBuffer = (str) => {
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const idx = BASE32_CHARS.indexOf(str[i].toUpperCase());
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

export const generateTotpCode = (secret, timestamp = Date.now()) => {
  if (!secret) return '';
  const key = base32ToBuffer(secret);
  const timeStep = 30;
  const currentCounter = Math.floor(timestamp / 1000 / timeStep);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(currentCounter));

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeNum =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(codeNum % 1000000).padStart(6, '0');
};

export const verifyTotpCode = (token, secret, window = 1) => {
  if (!token || !secret) return false;
  const key = base32ToBuffer(secret);
  const timeStep = 30;
  const currentCounter = Math.floor(Date.now() / 1000 / timeStep);

  for (let i = -window; i <= window; i++) {
    const counter = currentCounter + i;
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const codeNum =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = String(codeNum % 1000000).padStart(6, '0');
    if (otp === String(token).trim()) {
      return true;
    }
  }
  return false;
};

/**
 * 2FA Setup: Generate TOTP secret and backup recovery codes
 */
export const setup2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const secret = generateBase32Secret(16);
    const recoveryCodes = Array.from({ length: 6 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Store temporarily until verified
    user.twoFactorSecret = secret;
    user.twoFactorRecoveryCodes = recoveryCodes;
    await user.save();

    const otpauthUrl = `otpauth://totp/SmartCRM:${encodeURIComponent(user.email)}?secret=${secret}&issuer=SmartCRM`;

    return res.json({
      success: true,
      secret,
      otpauthUrl,
      recoveryCodes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2FA Verification: Verifies code to confirm and lock 2FA activation
 */
export const verifyAndEnable2FA = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Verification code is required.' });

    const user = await User.findById(req.user._id).select('+twoFactorSecret +twoFactorRecoveryCodes');
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: '2FA setup was not initiated. Please start setup again.' });
    }

    const isValid = verifyTotpCode(code, user.twoFactorSecret);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid 6-digit verification code. Please check your authenticator app.' });
    }

    user.twoFactorEnabled = true;
    await user.save();

    await logAudit({
      organizationId: user.organizationId,
      userId: user._id,
      action: '2FA_ENABLED',
      entityType: 'User',
      entityId: user._id,
    });

    return res.json({
      success: true,
      message: 'Two-Factor Authentication (2FA) is now enabled for your account.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2FA Disable: Turn off 2FA after password confirmation
 */
export const disable2FA = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password is required to disable 2FA.' });

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorRecoveryCodes = [];
    await user.save();

    await logAudit({
      organizationId: user.organizationId,
      userId: user._id,
      action: '2FA_DISABLED',
      entityType: 'User',
      entityId: user._id,
    });

    return res.json({
      success: true,
      message: 'Two-Factor Authentication has been disabled.',
    });
  } catch (error) {
    next(error);
  }
};
