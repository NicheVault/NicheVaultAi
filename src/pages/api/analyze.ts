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

            const problemsPrompt = `Generate 3 specific, real-world problems in the "${niche}" niche that entrepreneurs can solve.
              
              Respond ONLY with a valid JSON object in exactly this format, no additional text or formatting:
              {
                "problems": [
                  {
                    "title": "Problem Title",
                    "description": "Detailed problem description",
                    "audience": "Target audience affected",
                    "severity": "High/Medium/Low",
                    "complexity": "High/Medium/Low",
                    "example": "Real-world example"
                  }
                ]
              }`;

            try {
              // Make multiple requests in parallel
              const requests = Array(2).fill(null).map(async () => {
                const result = await model.generateContent(problemsPrompt);
                const text = await result.response.text();
                const cleaned = text
                  .replace(/```json\s*/g, '')
                  .replace(/```\s*/g, '')
                  .replace(/\n\s*/g, ' ')
                  .trim();

                try {
                  const parsed = JSON.parse(cleaned);
                  return parsed.problems || [];
                } catch (e) {
                  console.error('Parse error for batch:', e);
                  return [];
                }
              });

              const results = await Promise.all(requests);
              const allProblems = results.flat();

              // Remove duplicates based on title
              const uniqueProblems = Array.from(
                new Map(allProblems.map(p => [p.title, p])).values()
              );

              return { problems: uniqueProblems };
            } catch (error) {
              console.error('Problems generation error:', error);
              return {
                problems: [
                  {
                    title: "Market Research",
                    description: `Understanding customer needs in the ${niche} market`,
                    audience: "Business owners and entrepreneurs",
                    severity: "High",
                    complexity: "Medium",
                    example: `A startup needs to validate their ${niche} product idea`
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
              
              Format the response with these sections:
              1. Executive Summary
              2. Market Analysis
              3. Implementation Plan
              4. Business Model
              5. Marketing Strategy
              6. Risk Analysis
              7. Success Metrics
              8. Next Steps

              Keep the response focused and structured. No code blocks or special formatting needed.`;

            try {
              // Make multiple attempts to get a good response
              const attempts = Array(2).fill(null).map(async () => {
                const result = await model.generateContent(solutionPrompt);
                return result.response.text();
              });

              const solutions = await Promise.all(attempts);
              
              // Choose the best response (longest valid one)
              const validSolutions = solutions.filter(sol => 
                sol.includes('Executive Summary') && 
                sol.includes('Implementation Plan')
              );

              const bestSolution = validSolutions.reduce((best, current) => 
                current.length > best.length ? current : best
              , validSolutions[0] || solutions[0]);

              return { 
                solution: bestSolution
                  .replace(/```/g, '')
                  .replace(/\n\n+/g, '\n\n')
                  .trim()
              };
            } catch (error) {
              console.error('Solution generation error:', error);
              return { 
                solution: `
                  # Executive Summary
                  Solution approach for ${problem} in the ${niche} niche.
                  
                  # Implementation Plan
                  1. Research and Planning
                  2. Development Phase
                  3. Testing and Validation
                  4. Launch Strategy
                  
                  # Next Steps
                  Begin with market research and competitor analysis.
                `.replace(/\n\s+/g, '\n').trim()
              };
            }
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