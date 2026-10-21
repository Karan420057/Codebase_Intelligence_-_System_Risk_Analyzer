
import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getUnreadCount = asyncHandler(async (request, response) => {
  const count = await Notification.countDocuments({
    recipient: request.user._id,
    readAt: null,
  });

  response.json({ count });
});

export const getNotifications = asyncHandler(async (request, response) => {
  const notifications = await Notification.find({
    recipient: request.user._id,
  })
    .populate('actor', 'name email')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  response.json({
    notifications: notifications.map((item) => ({
      id: item._id.toString(),
      title: item.title,
      message: item.message,
      type: item.type,
      read: Boolean(item.readAt),
      createdAt: item.createdAt,
      actor: item.actor
        ? { name: item.actor.name, email: item.actor.email }
        : null,
    })),
  });
});

export const markAllRead = asyncHandler(async (request, response) => {
  const result = await Notification.updateMany(
    {
      recipient: request.user._id,
      readAt: null,
    },
    { $set: { readAt: new Date() } },
  );

  response.json({ success: true, markedRead: result.modifiedCount });
});

export const markOneRead = asyncHandler(async (request, response) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: request.params.id,
      recipient: request.user._id,
    },
    { $set: { readAt: new Date() } },
    { new: true },
  );

  if (!notification) {
    return response.status(404).json({
      error: 'Notification not found.',
    });
  }

  response.json({ success: true });
});
