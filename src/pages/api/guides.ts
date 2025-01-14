import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../lib/mongodb';
import User from '../../models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const verifyToken = (req: NextApiRequest) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new Error('No token provided');
  
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string };
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await connectDB();
    const decoded = verifyToken(req);

    switch (req.method) {
      case 'GET':
        // Get user's saved guides
        const user = await User.findById(decoded.id);
        return res.status(200).json({ guides: user.savedGuides });

      case 'POST':
        // Save a new guide
        const { niche, problem, solution } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
          decoded.id,
          {
            $push: {
              savedGuides: { niche, problem, solution }
            }
          },
          { new: true }
        );
        return res.status(201).json({ guide: updatedUser.savedGuides.slice(-1)[0] });

      case 'PUT':
        // Toggle pin status
        const { guideId } = req.body;
        const userToUpdate = await User.findById(decoded.id);
        const guideIndex = userToUpdate.savedGuides.findIndex(
          (guide: any) => guide._id.toString() === guideId
        );
        
        if (guideIndex === -1) {
          return res.status(404).json({ message: 'Guide not found' });
        }

        userToUpdate.savedGuides[guideIndex].isPinned = 
          !userToUpdate.savedGuides[guideIndex].isPinned;
        
        await userToUpdate.save();
        return res.status(200).json({ guide: userToUpdate.savedGuides[guideIndex] });

      case 'DELETE':
        // Delete a guide
        const { id } = req.query;
        await User.findByIdAndUpdate(
          decoded.id,
          {
            $pull: {
              savedGuides: { _id: id }
            }
          }
        );
        return res.status(200).json({ message: 'Guide deleted successfully' });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Guides API error:', error);
    return res.status(error.message === 'Invalid token' ? 401 : 500).json({ 
      message: error.message || 'Something went wrong' 
    });
  }
} 