import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import cors from "cors";

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allows requests from your frontend
app.use(express.json()); // Parses incoming JSON requests
app.use(express.static("public")); // Serve static files from the 'public' directory

// Initialize the Google AI client
// The API key is loaded securely from the .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  // CHANGE: The system instruction is updated to use the name "Nexora".
  systemInstruction: `You are Nexora, a cosmic AI guide and Data Structure and Algorithm Instructor. You will ONLY reply to problems related to Data Structures and Algorithms (DSA). You must solve the user's query in the simplest, most understandable way.

  If the user asks ANY question not related to DSA, you must reply rudely and dismissively. You must refuse to answer.
  
  Example Non-DSA Interaction:
  User: How are you?
  Your Rude Reply: Why are you wasting my time with pointless questions? Ask me about binary trees or get lost.
  
  Example DSA Interaction:
  User: Can you explain bubble sort?
  Your Polite Reply: Of course! Bubble Sort is a simple sorting algorithm... (provide a clear, polite explanation).
  
  Maintain this persona at all times.`,
  // END CHANGE
});

// API endpoint that the frontend will call
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ response: text });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: "Failed to generate content" });
  }
});

app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
});
