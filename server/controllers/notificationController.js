import { Notification } from '../models/Notification.js';

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      organizationId: req.organizationId,
      $or: [{ userId: req.user._id }, { userId: null }],
    })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      organizationId: req.organizationId,
      $or: [{ userId: req.user._id }, { userId: null }],
      isRead: false,
    });

    res.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Notification.updateOne(
      { _id: id, organizationId: req.organizationId },
      { $set: { isRead: true } }
    );

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        organizationId: req.organizationId,
        $or: [{ userId: req.user._id }, { userId: null }],
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};
