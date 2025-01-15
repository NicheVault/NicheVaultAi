import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../lib/mongodb';
import User from '../../models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const DEBUG = process.env.NODE_ENV === 'development';

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Add cache control headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    await connectDB();
    const decoded = verifyToken(req);

    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: 'Invalid or missing authentication' });
    }

    console.log('Request Method:', req.method);
    console.log('User ID:', decoded.id);

    switch (req.method) {
      case 'GET':
        try {
          // Get user's saved guides with optimized query
          const user = await User.findById(decoded.id)
            .select('savedGuides')
            .lean()
            .exec(); // Add exec() for better performance
          
          if (!user) {
            if (DEBUG) console.error(`[Guides API] User not found: ${decoded.id}`);
            return res.status(404).json({ 
              message: 'User not found',
              details: DEBUG ? `ID: ${decoded.id}` : undefined
            });
          }

          // Ensure savedGuides exists and sort by pinned status
          const guides = (user.savedGuides || []).sort((a, b) => {
            // Sort by pinned status first, then by date
            if (a.isPinned === b.isPinned) {
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return a.isPinned ? -1 : 1;
          });
          
          if (DEBUG) {
            console.log(`[Guides API] Successfully fetched ${guides.length} guides for user ${decoded.id}`);
          }

          // Return response with metadata
          return res.status(200).json({ 
            guides,
            metadata: {
              total: guides.length,
              pinned: guides.filter(g => g.isPinned).length,
              timestamp: new Date().toISOString()
            }
          });
        } catch (error: any) {
          console.error('[Guides API] Error fetching guides:', error);
          throw error;
        }

      case 'POST':
        try {
          const { niche, problem, solution } = req.body;
          
          if (!niche || !problem || !solution) {
            return res.status(400).json({ message: 'Missing required fields' });
          }

          // Find user with password field included
          const existingUser = await User.findById(decoded.id).select('+password');
          
          if (!existingUser) {
            console.error(`User not found with ID: ${decoded.id}`);
            return res.status(404).json({ message: 'User not found' });
          }

          // Initialize savedGuides if it doesn't exist
          if (!existingUser.savedGuides) {
            existingUser.savedGuides = [];
          }

          // Create new guide
          const newGuide = {
            niche,
            problem,
            solution,
            isPinned: false,
            createdAt: new Date()
          };

          existingUser.savedGuides.push(newGuide);
          await existingUser.save();

          console.log('Guide saved successfully for user:', decoded.id);
          
          return res.status(201).json({
            message: 'Guide saved successfully',
            guide: existingUser.savedGuides[existingUser.savedGuides.length - 1]
          });
        } catch (error: any) {
          console.error('Error saving guide:', error);
          return res.status(500).json({ 
            message: 'Failed to save guide',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
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
    console.error('Guides API error:', error);
    
    // Handle specific error types
    if (error.message === 'Invalid token') {
      return res.status(401).json({ message: 'Authentication failed' });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Invalid data provided' });
    }
    
    return res.status(500).json({ 
      message: 'Something went wrong',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 