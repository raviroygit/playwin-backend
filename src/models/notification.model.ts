import { Schema, model, Types, Document } from 'mongoose';

export interface INotification extends Document {
  type: 'global' | 'user' | 'agent';
  message: string;
  targetUser?: Types.ObjectId;
  targetAgent?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  type: { type: String, enum: ['global', 'user', 'agent'], required: true },
  message: { type: String, required: true },
  targetUser: { type: Schema.Types.ObjectId, ref: 'User' },
  targetAgent: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Notification = model<INotification>('Notification', notificationSchema); 