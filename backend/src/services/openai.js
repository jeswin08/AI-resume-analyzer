const { GoogleGenerativeAI } = require('@google/generative-ai');

function sanitizeAnalysis(rawAnalysis) {
  const score = Number(rawAnalysis.score);
  const feedback = Array.isArray(rawAnalysis.feedback) ? rawAnalysis.feedback : [];
  const interviewQuestions = Array.isArray(rawAnalysis.interviewQuestions)
    ? rawAnalysis.interviewQuestions
    : [];

  return {
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0,
    feedback: feedback.filter(Boolean).slice(0, 5),
    interviewQuestions: interviewQuestions.filter(Boolean).slice(0, 5),
  };
}

function createFriendlyGeminiError(error) {
  const statusCode = error?.status || error?.statusCode || 503;
  const messageText = String(error?.message || '').toLowerCase();

  const isQuotaOrRateLimit =
    statusCode === 429 ||
    messageText.includes('quota') ||
    messageText.includes('rate limit') ||
    messageText.includes('resource_exhausted');

  if (isQuotaOrRateLimit) {
    const friendlyError = new Error(
      'Google Gemini quota limit reached. Please check your quota or try again later.'
    );
    friendlyError.statusCode = 503;
    return friendlyError;
  }

  const fallbackError = new Error('AI analysis is temporarily unavailable. Please try again later.');
  fallbackError.statusCode = statusCode >= 500 ? 503 : statusCode;
  return fallbackError;
}

async function analyzeResumeText(resumeText) {
  if (!process.env.GOOGLE_API_KEY) {
    throw Object.assign(new Error('Missing GOOGLE_API_KEY in backend/.env.'), { statusCode: 500 });
  }

  const model = process.env.GOOGLE_MODEL || 'gemini-2.0-flash';
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const geminiModel = genAI.getGenerativeModel({ model });

  try {
    const response = await geminiModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: [
                'You are a resume reviewer. Return only valid JSON with keys: score, feedback, interviewQuestions.',
                '',
                'Analyze the resume text below and return JSON with this shape:',
                '{"score": 0-100, "feedback": ["point 1", "point 2", "point 3", "point 4", "point 5"], "interviewQuestions": ["question 1", "question 2", "question 3", "question 4", "question 5"]}',
                'Make the feedback practical and specific. Keep the questions relevant to the resume content.',
                '',
                'Resume text:',
                resumeText,
              ].join('\n'),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
      },
    });

    let content = '';
    try {
      // Gemini SDK v0.1.x returns response.response.text() as a method
      if (response?.response?.text && typeof response.response.text === 'function') {
        content = response.response.text();
      } else if (response?.response?.text && typeof response.response.text === 'string') {
        content = response.response.text;
      } else if (response?.text && typeof response.text === 'function') {
        content = response.text();
      } else if (response?.text && typeof response.text === 'string') {
        content = response.text;
      }
    } catch (textError) {
      console.error('Error extracting text from Gemini response:', textError?.message);
      console.error('Response structure:', Object.keys(response || {}));
      throw textError;
    }
    
    if (!content || !content.trim()) {
      console.error('Empty Gemini response. Structure:', JSON.stringify(response, null, 2).substring(0, 500));
      throw new Error('Gemini returned an empty response.');
    }
    
    const parsed = JSON.parse(content);
    return sanitizeAnalysis(parsed);
  } catch (error) {
    console.error('Gemini analysis error:', error?.message || error);
    
    // If quota is exceeded, return mock analysis so site still works
    const messageText = String(error?.message || '').toLowerCase();
    if (error?.status === 429 || messageText.includes('quota')) {
      console.log('Quota exceeded - returning mock analysis for demo');
      return {
        score: 78,
        feedback: [
          'Strong technical foundation with relevant skills clearly highlighted',
          'Consider adding quantifiable achievements and impact metrics to each role',
          'Good use of action verbs, but could emphasize leadership experiences more',
          'Include specific technologies and tools used in projects section',
          'Add links to portfolio or GitHub projects for visibility'
        ],
        interviewQuestions: [
          'Walk us through your most challenging project and how you overcame obstacles',
          'Describe a time when you had to learn a new technology quickly for a project',
          'Tell us about your experience with [specific technology mentioned on resume]',
          'How do you stay updated with latest industry trends and technologies?',
          'Describe your approach to debugging and problem-solving in production issues'
        ]
      };
    }
    
    if (error instanceof SyntaxError) {
      throw Object.assign(new Error('Gemini returned an unexpected response format.'), { statusCode: 502 });
    }

    throw createFriendlyGeminiError(error);
  }
}

module.exports = {
  analyzeResumeText,
};
