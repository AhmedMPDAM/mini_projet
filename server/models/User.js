// server/models/User.js
// Mongoose schema for the User model with role-based access control

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// SECURITY: Salt rounds for bcrypt hashing – 12 rounds provide a good
// balance between security and performance. Increasing this number makes
// brute-force attacks exponentially harder but slows down hashing.
const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[\w.-]+@[\w.-]+\.\w{2,}$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      // SECURITY: The 'select: false' option prevents the password field
      // from being returned in query results by default. You must explicitly
      // use .select('+password') when you need to verify credentials.
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['employee', 'manager', 'admin'],
        message: '{VALUE} is not a valid role',
      },
      default: 'employee',
    },
    // SECURITY: Store the refresh token hash (not plaintext) to prevent
    // token theft if the database is compromised.
    refreshToken: {
      type: String,
      select: false,
    },
    // Password reset fields
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt automatically
  }
);

// =============================================================
// Pre-save middleware: hash password before persisting
// =============================================================
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // SECURITY: Generate a salt and hash the password in one step.
    // bcrypt automatically stores the salt inside the hash string.
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    next();
  } catch (error) {
    next(error);
  }
});

// =============================================================
// Instance method: compare a candidate password against the hash
// =============================================================
userSchema.methods.comparePassword = async function (candidatePassword) {
  // SECURITY: bcrypt.compare is timing-safe, preventing timing attacks
  return bcrypt.compare(candidatePassword, this.password);
};

// =============================================================
// Instance method: strip sensitive fields from JSON output
// =============================================================
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
