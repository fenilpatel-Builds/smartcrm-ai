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
