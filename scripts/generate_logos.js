
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function generateLogo(prompt, filename) {
  console.log(`Generating ${filename}...`);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    });

    let imagePart = null;
    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                imagePart = part;
                break;
            }
        }
    }

    if (imagePart) {
      const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
      const outputPath = path.join(__dirname, '..', 'public', filename);
      fs.writeFileSync(outputPath, buffer);
      console.log(`Saved to ${outputPath}`);
    } else {
      console.error(`No image generated for ${filename}`);
      console.log(JSON.stringify(response, null, 2));
    }
  } catch (error) {
    console.error(`Error generating ${filename}:`, error);
  }
}

async function main() {
  await generateLogo(
    "A professional logo for 'AgroOptima Platforma Doradcza'. Clean, modern, minimalist, agricultural theme, green and white colors, vector style, flat design, white background. Text 'AgroOptima' prominent.",
    "logo-advisor.png"
  );
  
  await generateLogo(
    "A mobile app icon for 'AgroOptimaR Aplikacja dla Rolników'. Clean, modern, minimalist, agricultural theme, green and white colors, vector style, flat design, white background. Text 'AgroOptimaR' prominent.",
    "logo-farmer.png"
  );
}

main();
