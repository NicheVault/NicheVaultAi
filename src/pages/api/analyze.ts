import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { processBatchRequests } from '../../utils/batchProcessor';
import { rateLimiter } from '../../utils/apiRateLimit';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, niche, problem, currentSolution } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Wrap the API calls with rate limiting
    const makeApiCall = async (prompt: string) => {
      return rateLimiter.addToQueue(async () => {
        const result = await model.generateContent(prompt);
        return result.response.text();
      });
    };

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
        
        return res.status(200).json({ additionalContent });

      case 'getNiches': {
        const batchSize = 5;
        const totalNiches = 20;
        const batches = Math.ceil(totalNiches / batchSize);
        const excludeNiches = req.body.excludeNiches || [];
        
        const nicheBatches = await processBatchRequests(
          Array(batches).fill(null),
          1,
          async () => {
            const nichesPrompt = `Generate a list of ${batchSize} unique and profitable business niches${
              excludeNiches.length > 0 ? ' (excluding: ' + excludeNiches.join(', ') + ')' : ''
            }.
            
            Respond ONLY with a valid JSON object in exactly this format:
            {
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

            try {
              const response = await makeApiCall(nichesPrompt);
              const cleaned = response.replace(/```json\s*/g, '').replace(/```/g, '').trim();
              const parsed = JSON.parse(cleaned).niches;
              
              // Filter out any duplicates or excluded niches
              return parsed.filter((niche: any) => 
                !excludeNiches.includes(niche.name) &&
                parsed.findIndex((n: any) => n.name === niche.name) === parsed.indexOf(niche)
              );
            } catch (error) {
              console.error('Failed to parse batch response:', error);
              return [];
            }
          }
        );

        const allNiches = nicheBatches.flat();
        const categories = [...new Set(allNiches.map(n => n.category))];

        return res.status(200).json({
          categories,
          niches: allNiches
        });
      }

      case 'getProblems': {
        const problemBatches = await processBatchRequests(
          Array(2).fill(null),
          1,
          async () => {
            const problemsPrompt = `Analyze the "${niche}" niche and provide 3 real-world problems that entrepreneurs can solve.
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

            try {
              const response = await makeApiCall(problemsPrompt);
              const cleaned = response.replace(/```json\s*/g, '').replace(/```/g, '').trim();
              return JSON.parse(cleaned).problems;
            } catch (error) {
              console.error('Failed to parse problems batch:', error);
              return [];
            }
          }
        );

        return res.status(200).json({
          problems: problemBatches.flat()
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
    if (error.message.includes('429')) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again in a few moments.',
        retryAfter: 5 // Suggest retry after 5 seconds
      });
    }
    return res.status(500).json({ error: error.message || 'Something went wrong' });
  }
} 