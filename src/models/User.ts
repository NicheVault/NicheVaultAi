import mongoose, { Document, Schema, Types, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Define interfaces for type safety
interface IGuide {
  niche: string;
  problem: string;
  solution: string;
  isPinned: boolean;
  createdAt: Date;
  _id?: Types.ObjectId;
}

interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  savedGuides: Types.DocumentArray<IGuide & Document>;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

// Create the guide schema
const guideSchema = new Schema<IGuide>({
  niche: {
    type: String,
    required: true
  },
  problem: {
    type: String,
    required: true
  },
  solution: {
    type: String,
    required: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create the user schema
const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  name: {
    type: String,
    required: [true, 'Please provide a name'],
  },
  savedGuides: {
    type: [guideSchema],
    default: function() {
      return new Types.DocumentArray<IGuide & Document>([]);
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Initialize savedGuides if undefined
userSchema.pre('save', function(next) {
  if (!this.savedGuides) {
    // Initialize with a new DocumentArray
    this.savedGuides = new Types.DocumentArray<IGuide & Document>([]);
  }
  next();
});

// Match password method
userSchema.methods.matchPassword = async function(enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Add toJSON method to remove password from responses
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Add indexes for better query performance
userSchema.index({ 'savedGuides.isPinned': 1 });
userSchema.index({ 'savedGuides.createdAt': -1 });

// Create and export the model with proper typing
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User; 