import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../lib/mongodb';
import User from '../../models/User';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const DEBUG = process.env.NODE_ENV === 'development';

// Add interface for guide
interface IGuide {
  niche: string;
  problem: string;
  solution: string;
  isPinned: boolean;
  createdAt: Date;
  _id?: Types.ObjectId;
}

// Middleware to verify JWT token
const verifyToken = (req: NextApiRequest) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new Error('No token provided');
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    if (!decoded || !decoded.id) {
      throw new Error('Invalid token payload');
    }
    return decoded;
  } catch (error: any) {
    console.error('Token verification error:', error);
    throw new Error(error.message || 'Authentication failed');
  }
};

// Add timeout helper
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    )
  ]) as Promise<T>;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Add early timeout header
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=8');

  try {
    // Connect to DB with timeout
    await withTimeout(connectDB(), 5000);
    const decoded = verifyToken(req);

    if (!decoded?.id) {
      return res.status(401).json({ message: 'Invalid or missing authentication' });
    }

    switch (req.method) {
      case 'GET':
        try {
          // Optimize query with lean and timeout
          const user = await withTimeout(
            User.findById(decoded.id)
              .select('savedGuides')
              .lean()
              .exec(),
            3000
          );
          
          if (!user) {
            return res.status(404).json({ message: 'User not found' });
          }

          // Process guides in memory to avoid timeout
          const guides = (user.savedGuides || [])
            .sort((a, b) => {
              if (a.isPinned === b.isPinned) {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              }
              return a.isPinned ? -1 : 1;
            })
            .map(guide => ({
              ...guide,
              createdAt: new Date(guide.createdAt).toISOString()
            }));

          return res.status(200).json({ guides });
        } catch (error: any) {
          if (error.message === 'Operation timed out') {
            return res.status(504).json({ message: 'Request timed out' });
          }
          throw error;
        }

      case 'POST':
        try {
          const { niche, problem, solution } = req.body;
          
          if (!niche || !problem || !solution) {
            return res.status(400).json({ message: 'Missing required fields' });
          }

          // Use findOneAndUpdate for atomic operation
          const result = await withTimeout(
            User.findOneAndUpdate(
              { _id: decoded.id },
              {
                $push: {
                  savedGuides: {
                    niche,
                    problem,
                    solution,
                    isPinned: false,
                    createdAt: new Date()
                  }
                }
              },
              { new: true, select: 'savedGuides.$' }
            ).exec(),
            5000
          );

          if (!result) {
            return res.status(404).json({ message: 'User not found' });
          }

          const newGuide = result.savedGuides[result.savedGuides.length - 1];
          return res.status(201).json({ guide: newGuide });
        } catch (error: any) {
          if (error.message === 'Operation timed out') {
            return res.status(504).json({ message: 'Request timed out' });
          }
          throw error;
        }

      case 'PUT':
        // Toggle pin status with validation
        const { guideId } = req.body;
        const userToUpdate = await User.findById(decoded.id);
        
        if (!userToUpdate) {
          return res.status(404).json({ message: 'User not found' });
        }

        if (!userToUpdate.savedGuides) {
          return res.status(404).json({ message: 'No guides found for user' });
        }

        const guideIndex = userToUpdate.savedGuides.findIndex(
          (guide: any) => guide._id.toString() === guideId
        );
        
        if (guideIndex === -1) {
          return res.status(404).json({ message: 'Guide not found' });
        }

        userToUpdate.savedGuides[guideIndex].isPinned = 
          !userToUpdate.savedGuides[guideIndex].isPinned;
        
        await userToUpdate.save();
        return res.status(200).json({ 
          guide: userToUpdate.savedGuides[guideIndex] 
        });

      case 'DELETE':
        // Delete a guide with validation
        const { id } = req.query;
        const userForDelete = await User.findById(decoded.id);
        
        if (!userForDelete) {
          return res.status(404).json({ message: 'User not found' });
        }

        if (!userForDelete.savedGuides) {
          return res.status(404).json({ message: 'No guides found for user' });
        }

        const updatedUserAfterDelete = await User.findByIdAndUpdate(
          decoded.id,
          {
            $pull: {
              savedGuides: { _id: id }
            }
          },
          { new: true }
        );

        if (!updatedUserAfterDelete) {
          throw new Error('Failed to delete guide');
        }

        return res.status(200).json({ message: 'Guide deleted successfully' });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    
    if (error.message === 'Operation timed out') {
      return res.status(504).json({ message: 'Request timed out' });
    }
    
    return res.status(error.status || 500).json({ 
      message: error.message || 'Something went wrong'
    });
  }
} 