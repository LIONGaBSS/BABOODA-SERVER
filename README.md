# Babooda Server

This is the backend for the Babooda teaching chatbot.  
It handles API requests from the frontend and connects with OpenAI + syllabus JSON files.

## Project Structure
- `/api/chat.js` → Chatbot API endpoint
- `/syllabus/` → JSON syllabus for different classes
- `package.json` → Node dependencies

## Deployment
- Hosted on Vercel
- Environment Variables:
  - `OPENAI_API_KEY`
  - (Optional future keys)

## Usage
Frontend (Babooda repo) sends user messages → Backend (this repo) processes → Responds with either:
1. Syllabus-based teaching material (PDF/Audio links), or
2. AI-generated teaching responses (OpenAI).
