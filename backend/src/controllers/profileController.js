
import Repository from '../models/Repository.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getProfile = asyncHandler(async (request, response) => {
  const user = request.user;
  const repositoryCount = await Repository.countDocuments({
    userId: user._id,
  });

  response.json({
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      repositoryCount,
      preferences: {
        language: user.preferences?.language ?? 'en',
        theme: user.preferences?.theme ?? 'system',
      },
    },
  });
});

export const updateProfile = asyncHandler(async (request, response) => {
  const { name } = request.body ?? {};

  if (
    typeof name !== 'string' ||
    name.trim().length < 2 ||
    name.trim().length > 80
  ) {
    return response.status(400).json({
      error: 'Name must contain between 2 and 80 characters.',
    });
  }

  request.user.name = name.trim();
  await request.user.save();

  response.json({
    profile: {
      id: request.user.id,
      name: request.user.name,
      email: request.user.email,
      role: request.user.role,
      createdAt: request.user.createdAt,
    },
  });
});
