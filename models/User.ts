import mongoose, { Model } from "mongoose";

export type UserDocument = { _id: mongoose.Types.ObjectId; username: string; email: string; password: string };

const userSchema = new mongoose.Schema<UserDocument>({
  username: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 40 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
}, { timestamps: true });

export const User: Model<UserDocument> = (mongoose.models.User as Model<UserDocument> | undefined) || mongoose.model<UserDocument>("User", userSchema);
