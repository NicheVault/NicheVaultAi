import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContent("Hello, are you working?");
    const response = await result.response.text();
    
    return res.status(200).json({ response });
  } catch (error: any) {
    return res.status(500).json({ 
      error: 'API Test Failed', 
      message: error.message,
      details: error.toString()
    });
  }
} 