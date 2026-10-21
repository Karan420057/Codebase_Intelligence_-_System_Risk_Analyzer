import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getSettings = asyncHandler(async (request, response) => {
  response.json({
    settings: {
      language: request.user.preferences?.language ?? 'en',
      theme: request.user.preferences?.theme ?? 'system',
      role: request.user.role,
      availableLanguages: ['en', 'hi'],
    },
  });
});

export const updateSettings = asyncHandler(async (request, response) => {
  const { language, theme } = request.body ?? {};

  if (language !== undefined && !['en', 'hi'].includes(language)) {
    return response.status(400).json({ error: 'Unsupported language.' });
  }

  if (
    theme !== undefined &&
    !['light', 'dark', 'system'].includes(theme)
  ) {
    return response.status(400).json({ error: 'Unsupported theme.' });
  }

  if (language !== undefined) {
    request.user.set('preferences.language', language);
  }

  if (theme !== undefined) {
    request.user.set('preferences.theme', theme);
  }

  await request.user.save();

  response.json({
    settings: {
      language: request.user.preferences?.language ?? 'en',
      theme: request.user.preferences?.theme ?? 'system',
    },
  });
});

export const getAdminOverview = asyncHandler(async (request, response) => {
  const [users, admins] = await Promise.all([
    User.countDocuments({
      role: "user",
      $or: [
        { status: "active" },
        { status: { $exists: false } },
      ],
    }),
    User.countDocuments({
      role: "admin",
      $or: [
        { status: "active" },
        { status: { $exists: false } },
      ],
    }),
  ]);

  response.json({ users, admins });
});
