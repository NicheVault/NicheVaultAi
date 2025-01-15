import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { processBatchRequests } from '../../utils/batchProcessor';
import { rateLimiter } from '../../utils/apiRateLimit';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Increase timeout and add more retries
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const BATCH_TIMEOUT = 8000; // 8 seconds per batch

const retryWithTimeout = async <T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  retries = MAX_RETRIES
): Promise<T> => {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
        )
      ]) as T;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      lastError = error;
      if (i < retries - 1) {
        // Exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, i);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { action, niche, problem, currentSolution } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    switch (action) {
      case 'getNiches': {
        const batchSize = 2; // Reduced batch size
        const totalNiches = 8; // Reduced total niches
        const batches = Math.ceil(totalNiches / batchSize);
        const excludeNiches = req.body.excludeNiches || [];
        
        let allNiches = [];
        
        for (let i = 0; i < batches; i++) {
          try {
            const nichesPrompt = `Generate ${batchSize} unique and profitable business niches${
              excludeNiches.length > 0 ? ' (excluding: ' + excludeNiches.join(', ') + ')' : ''
            }.
            
            Respond in this exact JSON format:
            {
              "niches": [
                {
                  "name": "Example Niche",
                  "category": "Technology/Health/Business/Education",
                  "description": "Brief description under 100 chars",
                  "potential": "★★★★☆",
                  "competition": "Low/Medium/High"
                }
              ]
            }`;

            const result = await retryWithTimeout(
              async () => {
                const response = await model.generateContent(nichesPrompt);
                const text = response.response.text();
                try {
                  // Clean and parse the response
                  const cleaned = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();
                  const parsed = JSON.parse(cleaned);
                  return parsed.niches || [];
                } catch (parseError) {
                  console.error('Parse error:', parseError);
                  // Fallback format if JSON parsing fails
                  return [{
                    name: text.split('\n')[0].replace(/^\d+\.\s*/, '').trim(),
                    category: 'Other',
                    description: 'Generated niche opportunity',
                    potential: '★★★☆☆',
                    competition: 'Medium'
                  }];
                }
              },
              BATCH_TIMEOUT
            );

            allNiches = [...allNiches, ...result];

            // Add delay between batches to avoid rate limiting
            if (i < batches - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (error) {
            console.error(`Batch ${i + 1} failed:`, error);
            // Continue with partial results if we have any
            if (allNiches.length > 0) {
              break;
            }
            continue;
          }
        }

        // If we have no niches at all, throw an error
        if (allNiches.length === 0) {
          throw new Error('Failed to generate niches. Please try again.');
        }

        // Remove duplicates and format response
        const uniqueNiches = Array.from(new Set(allNiches.map(n => n.name)))
          .map(name => allNiches.find(n => n.name === name))
          .filter(Boolean);

        const categories = [...new Set(uniqueNiches.map(n => n.category))];

        return res.status(200).json({
          categories,
          niches: uniqueNiches.slice(0, totalNiches)
        });
      }

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
        
        return res.status(200).json({ additionalContent });

      case 'getProblems': {
        const batchSize = 3;
        const batches = 2;
        let allProblems = [];

        for (let i = 0; i < batches; i++) {
          try {
            const problemsPrompt = `Analyze the "${niche}" niche and provide ${batchSize} real-world problems that entrepreneurs can solve.
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
              }`;

            const result = await retryWithTimeout(
              async () => {
                const response = await model.generateContent(problemsPrompt);
                const text = response.response.text();
                try {
                  // Clean and parse the response
                  const cleaned = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();
                  return JSON.parse(cleaned).problems;
                } catch (parseError) {
                  console.error('Parse error:', parseError);
                  return [];
                }
              },
              5000 // 5 second timeout
            );

            allProblems = [...allProblems, ...result];
          } catch (error) {
            console.error(`Batch ${i} failed:`, error);
            continue; // Skip failed batch and continue
          }
        }

        // Remove duplicates by title
        const uniqueProblems = Array.from(new Set(allProblems.map(p => p.title)))
          .map(title => allProblems.find(p => p.title === title))
          .filter(Boolean);

        return res.status(200).json({
          problems: uniqueProblems
        });
      }

      case 'getSolution': {
        const sections = [
          {
            title: 'Executive Summary & Market Analysis',
            prompts: [
              `Provide a concise executive summary and market analysis for solving "${problem}" in the ${niche} niche.
               Format your response in clear paragraphs, using:
               - Regular text for normal content
               - ## for section headings
               - • for bullet points (no asterisks or markdown)
               
               Focus on key opportunities and market validation.
               Keep it under 250 words total.`
            ]
          },
          {
            title: 'Implementation Strategy',
            prompts: [
              `Create a practical implementation plan for solving "${problem}" in the ${niche} niche.
               Format your response using:
               - ## for section headings
               - • for bullet points (no asterisks or markdown)
               - Regular text for descriptions
               
               Include:
               • Key steps and timeline
               • Required resources
               • Success metrics
               
               Keep it actionable and under 250 words.`
            ]
          },
          {
            title: 'Business & Revenue Model',
            prompts: [
              `Outline the business and revenue model for solving "${problem}" in the ${niche} niche.
               Format using:
               - ## for section headings
               - • for bullet points (no asterisks or markdown)
               - Regular text for explanations
               
               Include:
               • Revenue streams
               • Pricing strategy
               • Cost structure
               
               Keep it focused and under 250 words.`
            ]
          }
        ];

        const solutionParts = await processBatchRequests(
          sections,
          3,
          async (section) => {
            const results = await Promise.all(
              section.prompts.map(async (prompt) => {
                const result = await model.generateContent(prompt);
                const response = await result.response.text();
                return response
                  .trim()
                  .replace(/\*\*/g, '')
                  .replace(/\*/g, '')
                  .replace(/- /g, '• ')
                  .replace(/\n\n+/g, '\n\n');
              })
            );
            
            return `## ${section.title}\n\n${results.join('\n\n')}`;
          }
        );

        return res.status(200).json({
          solution: solutionParts.join('\n\n')
        });
      }

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(error.status || 500).json({ 
      message: error.message || 'Something went wrong',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
} 