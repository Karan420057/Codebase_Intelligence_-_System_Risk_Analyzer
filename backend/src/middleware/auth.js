import User from '../models/User.js';

export async function requireAuth(request, response, next) {
  try {
    const userId = request.session?.userId;

    if (!userId) {
      return response.status(401).json({
        error: 'Authentication is required.',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return response.status(401).json({
        error: 'Authentication is required.',
      });
    }

    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(role) {
  return (request, response, next) => {
    if (!request.user || request.user.role !== role) {
      return response.status(403).json({
        error: 'You do not have permission to access this resource.',
      });
    }

    next();
  };
}

export const requireAdmin = requireRole('admin');