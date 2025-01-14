import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Update config to stay within Hobby plan limits
export const config = {
  maxDuration: 60 // Set to maximum allowed for Hobby plan (60 seconds)
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Reduce timeout to be safely under the 60-second limit
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), 50000); // 50 second timeout
  });

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Race between the API call and timeout
    const result = await Promise.race([
      handleRequest(req, model),
      timeoutPromise
    ]);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(error.message === 'Request timeout' ? 504 : 500).json({
      error: error.message,
      userMessage: error.message === 'Request timeout' 
        ? 'Request took too long. Please try again.'
        : 'An unexpected error occurred. Please try again.'
    });
  }
}

async function handleRequest(req: NextApiRequest, model: any) {
  const { action } = req.body;

  switch (action) {
    case 'getNiches': {
      // Reduce the workload to fit within time constraints
      const categories = ['Technology', 'Health', 'Education', 'Business', 'Lifestyle'];
      const nichesPerCategory = 1; // Generate just 1 niche per category to reduce time
      
      const niches = [];
      
      // Only process 3 random categories to stay within time limit
      const randomCategories = categories
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      
      for (const category of randomCategories) {
        const prompt = `Generate ${nichesPerCategory} profitable digital product niche in the ${category} category.
          Format as JSON array with fields: name, category, description, potential (High/Medium/Low), competition (High/Medium/Low).
          Keep descriptions concise.`;
        
        try {
          const result = await model.generateContent(prompt);
          const response = await result.response.text();
          const parsedNiches = JSON.parse(response);
          niches.push(...parsedNiches);
        } catch (e) {
          console.error(`Error processing ${category}:`, e);
          continue; // Skip failed category and continue with others
        }
      }

      return { 
        categories, // Return all categories even though we only processed some
        niches 
      };
    }
    // ... rest of your switch cases
  }
} 