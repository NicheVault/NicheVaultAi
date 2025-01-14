import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export const config = {
  maxDuration: 60 // Set to maximum allowed for Hobby plan
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Add timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), 50000);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!req.body.action) {
      return res.status(400).json({
        error: 'Missing required action parameter',
        userMessage: 'Something went wrong. Please try again.'
      });
    }

    const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const rateLimitKey = `rateLimit:${userIP}`;
    
    const { action, niche, problem, currentSolution } = req.body;

    // Wrap the main logic in Promise.race
    const result = await Promise.race([
      (async () => {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        switch (action) {
          case 'expandSolution':
            const expandPrompt = `
              I have a solution guide for the problem "${problem}" in the "${niche}" niche.
              Current solution: ${currentSolution}
              
              Please expand this solution with:
              1. More detailed implementation steps
              2. Additional strategies and tactics
              3. Specific tools and resources
              4. Common pitfalls to avoid
              5. Success metrics and KPIs
              
              Format the response with proper headings (using #), bold text (using **), and bullet points (using -).
              Make sure the additional content complements the existing solution without repeating information.
            `;

            const expandResult = await model.generateContent(expandPrompt);
            const expandResponse = await expandResult.response;
            const additionalContent = expandResponse.text();
            
            return { additionalContent };

          case 'getNiches': {
            const { batch = 1 } = req.body;
            const categories = ['Technology', 'Health', 'Education', 'Finance', 'Lifestyle', 'Entertainment', 'Sports', 'Food', 'Travel', 'Fashion'];
            
            // Get 2 random categories per batch to stay under limits
            const selectedCategories = categories
              .sort(() => Math.random() - 0.5)
              .slice((batch - 1) * 2, batch * 2);

            const nichesPrompt = `Generate 4 profitable business niches focusing on these categories: ${selectedCategories.join(', ')}.
              
              Respond ONLY with a valid JSON object in exactly this format:
              {
                "categories": ${JSON.stringify(categories)},
                "niches": [
                  {
                    "name": "Example Niche",
                    "category": "Technology",
                    "description": "Brief description under 100 chars",
                    "potential": "★★★★☆",
                    "competition": "Medium"
                  }
                ]
              }`;

            const nichesResult = await model.generateContent(nichesPrompt);
            const nichesText = await nichesResult.response.text();
            
            try {
              const cleanedText = nichesText.trim()
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .replace(/\n/g, ' ')
                .trim();

              const parsedResponse = JSON.parse(cleanedText);
              return {
                ...parsedResponse,
                batch,
                totalBatches: Math.ceil(categories.length / 2)
              };
            } catch (error) {
              console.error('Niche generation error:', error);
              return {
                error: error.message,
                userMessage: 'Failed to generate niches. Please try again in a moment.'
              };
            }
            break;
          }

          case 'getProblems': {
            if (!niche) {
              return {
                error: 'Niche parameter is required',
                userMessage: 'Please select a niche first.'
              };
            }

            const problemsPrompt = `Analyze the "${niche}" niche and provide 5 real-world problems that entrepreneurs can solve.
            Respond in this exact JSON format:
            {
              "problems": [
                {
                  "title": "Problem Title",
                  "description": "Detailed problem description",
                  "audience": "Target audience affected",
                  "severity": "High/Medium/Low",
                  "complexity": "High/Medium/Low",
                  "example": "Real-world example of this problem"
                }
              ]
            }
            
            Important: Ensure the response is valid JSON and properly formatted. Do not include any markdown code blocks or additional text.`;

            const problemsResult = await model.generateContent(problemsPrompt);
            const problemsText = await problemsResult.response.text();
            let cleanedText = '';
            
            try {
              cleanedText = problemsText
                .replace(/```json\s*/g, '')
                .replace(/```\s*/g, '')
                .replace(/\n\s*/g, ' ')
                .trim();

              if (!cleanedText.startsWith('{') || !cleanedText.endsWith('}')) {
                throw new Error('Invalid JSON format in response');
              }

              const parsedProblems = JSON.parse(cleanedText);

              if (!parsedProblems.problems || !Array.isArray(parsedProblems.problems)) {
                throw new Error('Invalid response structure');
              }

              return parsedProblems;
            } catch (parseError) {
              console.error('Failed to parse problems JSON:', {
                originalText: problemsText,
                cleanedText: cleanedText,
                error: parseError
              });

              return {
                problems: [
                  {
                    title: "Market Analysis",
                    description: "Understanding market trends and customer needs in the " + niche + " niche",
                    audience: "Entrepreneurs and business owners",
                    severity: "Medium",
                    complexity: "Medium",
                    example: "A business owner needs to validate their product idea in the " + niche + " market"
                  }
                ]
              };
            }
            break;
          }

          case 'getSolution': {
            if (!niche || !problem) {
              return { error: 'Niche and problem are required' };
            }

            const solutionPrompt = `Create a detailed solution guide for this problem: "${problem}" in the ${niche} niche.
            Format the response in HTML with these sections:
            - Executive Summary
            - Market Analysis
            - Implementation Plan
            - Business Model
            - Marketing Strategy
            - Risk Analysis
            - Success Metrics
            - Next Steps`;

            const solutionResult = await model.generateContent(solutionPrompt);
            const solution = await solutionResult.response.text();

            return { 
              solution: solution.replace(/```html/g, '').replace(/```/g, '')
            };
            break;
          }

          default:
            return { error: 'Invalid action' };
        }
      })(),
      timeoutPromise
    ]);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: error.message,
      userMessage: error.message === 'Request timeout' 
        ? 'Request took too long. Please try again.'
        : 'An unexpected error occurred. Please try again.'
    });
  }
} 