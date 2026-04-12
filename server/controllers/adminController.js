// server/controllers/adminController.js
// Administration controller for user management (RBAC, Status)
// =========================================================

const User = require('../models/User');

// =============================================================
// GET /api/users
// Fetch all users with server-side pagination (10 per page)
// =============================================================
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Optional search by name/email (simple regex)
    const searchQuery = req.query.search || '';
    const filter = {};
    
    if (searchQuery) {
      filter.$or = [
        { firstName: { $regex: searchQuery, $options: 'i' } },
        { lastName: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users.',
    });
  }
};

// =============================================================
// PATCH /api/users/:id/role
// Modify a user's role. Admins cannot change their own role.
// =============================================================
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const adminId = req.user.userId;

    const validRoles = ['employee', 'manager', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role provided.',
      });
    }

    // SECURITY: Prevent self-modification
    if (id === adminId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You cannot change your own role.',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User role updated successfully to ${role}.`,
      data: { user },
    });
  } catch (error) {
    console.error('updateUserRole error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user role.',
    });
  }
};

// =============================================================
// PATCH /api/users/:id/status
// Activate or deactivate a user account.
// =============================================================
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const adminId = req.user.userId;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value.',
      });
    }

    // SECURITY: Prevent self-deactivation
    if (id === adminId.toString() && isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'You cannot deactivate your own account.',
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Account has been ${isActive ? 'activated' : 'deactivated'}.`,
      data: { user },
    });
  } catch (error) {
    console.error('toggleUserStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle user status.',
    });
  }
};

module.exports = {
  getUsers,
  updateUserRole,
  toggleUserStatus,
};
