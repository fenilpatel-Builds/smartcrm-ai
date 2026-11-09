import bcrypt from 'bcryptjs';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { logAudit } from '../services/audit/auditService.js';

export const getCurrentOrganization = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    res.json({
      success: true,
      data: org,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCurrentOrganization = async (req, res, next) => {
  try {
    const { name, phone, address, currency, timezone, settings } = req.body;

    const org = await Organization.findById(req.organizationId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    if (name) org.name = name;
    if (phone !== undefined) org.phone = phone;
    if (address) org.address = { ...org.address, ...address };
    if (currency) org.currency = currency;
    if (timezone) org.timezone = timezone;
    if (settings) org.settings = { ...org.settings, ...settings };

    await org.save();

    await logAudit({
      organizationId: org._id,
      userId: req.user._id,
      action: 'UPDATE_ORGANIZATION_PROFILE',
      entityType: 'Organization',
      entityId: org._id,
    });

    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: org,
    });
  } catch (error) {
    next(error);
  }
};

export const getMembers = async (req, res, next) => {
  try {
    const members = await User.find({ organizationId: req.organizationId })
      .select('name email role avatar isActive lastLogin createdAt')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

export const inviteMember = async (req, res, next) => {
  try {
    const { name, email, role = 'employee', password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User with this email is already registered.' });
    }

    const tempPassword = password || 'WelcomeSmartCRM2026!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: ['owner', 'manager', 'employee'].includes(role) ? role : 'employee',
      organizationId: req.organizationId,
      isVerified: true,
      isActive: true,
    });

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'INVITE_TEAM_MEMBER',
      entityType: 'User',
      entityId: newUser._id,
      metadata: { invitedEmail: email, role },
    });

    res.status(201).json({
      success: true,
      message: `Team member ${name} added successfully.`,
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        tempPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMemberRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, isActive } = req.body;

    const user = await User.findOne({ _id: id, organizationId: req.organizationId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Team member not found in this organization.' });
    }

    if (role && ['owner', 'manager', 'employee'].includes(role)) {
      user.role = role;
    }
    if (typeof isActive === 'boolean') {
      user.isActive = isActive;
    }

    await user.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'UPDATE_MEMBER_ROLE',
      entityType: 'User',
      entityId: user._id,
      metadata: { updatedRole: role, isActive },
    });

    res.json({
      success: true,
      message: 'Member updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const listAllOrganizations = async (req, res, next) => {
  try {
    // Only super_admin
    const organizations = await Organization.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    next(error);
  }
};
