import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
        const nichesPrompt = `Generate a list of 20 profitable business niches.
        
        Respond ONLY with a valid JSON object in exactly this format:
        {
          "categories": ["Technology", "Health", "Education", "Finance", "Lifestyle"],
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
          return res.status(200).json(parsedResponse);
        } catch (parseError) {
          console.error('Failed to parse niches JSON:', nichesText);
          return res.status(200).json({
            categories: ['Technology', 'Health', 'Education', 'Finance', 'Lifestyle'],
            niches: [
              {
                name: 'AI Solutions',
                category: 'Technology',
                description: 'Develop AI-powered solutions for businesses',
                potential: '★★★★★',
                competition: 'Medium'
              },
              {
                name: 'Digital Wellness',
                category: 'Health',
                description: 'Online mental health and wellness services',
                potential: '★★★★☆',
                competition: 'Medium'
              },
              {
                name: 'EdTech Platform',
                category: 'Education',
                description: 'Online learning and skill development',
                potential: '★★★★☆',
                competition: 'Medium'
              }
            ]
          });
        }
        break;
      }

      case 'getProblems': {
        if (!niche) {
          return res.status(400).json({ error: 'Niche is required' });
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

          return res.status(200).json(parsedProblems);
        } catch (parseError) {
          console.error('Failed to parse problems JSON:', {
            originalText: problemsText,
            cleanedText: cleanedText,
            error: parseError
          });

          return res.status(200).json({
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
          });
        }
        break;
      }

      case 'getSolution': {
        if (!niche || !problem) {
          return res.status(400).json({ error: 'Niche and problem are required' });
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

        return res.status(200).json({ 
          solution: solution.replace(/```html/g, '').replace(/```/g, '')
        });
        break;
      }

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Something went wrong' });
  }
} 