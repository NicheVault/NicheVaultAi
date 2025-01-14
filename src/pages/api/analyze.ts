import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Increase timeout for the API route
export const config = {
  maxDuration: 300 // Set maximum duration to 5 minutes
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Add timeout handling
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), 25000); // 25 second timeout
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
      // Break down the niche generation into smaller chunks
      const categories = ['Technology', 'Health', 'Education', 'Business', 'Lifestyle'];
      const nichesPerCategory = 2; // Reduce number of niches per request
      
      const niches = [];
      
      for (const category of categories) {
        const prompt = `Generate ${nichesPerCategory} profitable digital product niches in the ${category} category.
          Format as JSON array with fields: name, category, description, potential (High/Medium/Low), competition (High/Medium/Low)`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response.text();
        
        try {
          const parsedNiches = JSON.parse(response);
          niches.push(...parsedNiches);
        } catch (e) {
          console.error(`Error parsing niches for ${category}:`, e);
        }
      }

      return { categories, niches };
    }
    // ... rest of your switch cases
  }
} 