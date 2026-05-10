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
    statusCode === 429 || messageText.includes('quota') || messageText.includes('rate limit');
  if (isQuotaOrRateLimit) {
    const e = new Error('Google Gemini quota limit reached.');
    e.statusCode = 503;
    return e;
  }
  const e = new Error('AI analysis is temporarily unavailable.');
  e.statusCode = statusCode >= 500 ? 503 : statusCode;
  return e;
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
      generationConfig: { temperature: 0.3, topK: 40, topP: 0.95 },
    });

    let content = '';
    try {
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
      throw textError;
    }

    if (!content || !content.trim()) {
      throw new Error('Gemini returned an empty response.');
    }

    let cleanContent = content.trim();
    cleanContent = cleanContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleanContent);
    return sanitizeAnalysis(parsed);
  } catch (error) {
    console.error('Gemini analysis error:', error?.message || error);
    const messageText = String(error?.message || '').toLowerCase();
    if (error?.status === 429 || messageText.includes('quota')) {
      console.log('Quota exceeded - using local dynamic analysis');
      return analyzeResumeLocally(resumeText);
    }
    if (error instanceof SyntaxError) {
      throw Object.assign(new Error('Gemini returned an unexpected response format.'), { statusCode: 502 });
    }
    throw createFriendlyGeminiError(error);
  }
}

// ─── Field detection ────────────────────────────────────────────────────────

const FIELD_SKILLS = {
  technology: ['javascript','python','java','react','node.js','typescript','sql','html','css','docker','aws','git','angular','vue','c++','c#','golang','ruby','php','kubernetes','mongodb','postgresql','redis','graphql','rest','linux','tensorflow','pytorch','machine learning','deep learning','data science','agile','scrum','ci/cd','microservices','swift','kotlin','flutter','django','flask','express','next.js','tailwind','firebase','azure','gcp','terraform'],
  healthcare: ['patient care','clinical','diagnosis','treatment','ehr','hipaa','medical records','nursing','pharmacy','radiology','surgery','triage','cpr','bls','acls','vital signs','phlebotomy','medication','icu','er','pediatrics','oncology','cardiology','physical therapy','occupational therapy','mental health','counseling','emr','epic','charting'],
  finance: ['accounting','financial analysis','budgeting','forecasting','auditing','tax','gaap','ifrs','investment','portfolio','risk management','compliance','banking','underwriting','credit','equity','derivatives','bloomberg','excel','financial modeling','reconciliation','accounts payable','accounts receivable','bookkeeping','quickbooks','sap','treasury','valuation','mergers'],
  marketing: ['seo','sem','social media','content marketing','email marketing','brand','analytics','google analytics','advertising','copywriting','campaign','crm','hubspot','salesforce','market research','ppc','conversion','engagement','brand strategy','public relations','pr','communications','digital marketing','growth','lead generation','a/b testing','influencer','branding'],
  education: ['teaching','curriculum','lesson plan','classroom','student','pedagogy','assessment','grading','tutoring','mentoring','special education','eld','esl','differentiation','instructional design','e-learning','lms','canvas','blackboard','moodle','academic','research','publishing','faculty','lecturing','syllabus','accreditation'],
  design: ['figma','photoshop','illustrator','sketch','adobe','indesign','ui','ux','wireframe','prototype','typography','color theory','branding','logo','layout','responsive design','user research','usability','interaction design','motion graphics','after effects','premiere','3d modeling','blender','autocad','graphic design','visual design'],
  legal: ['litigation','contract','compliance','regulatory','paralegal','legal research','case management','negotiation','arbitration','mediation','intellectual property','patent','trademark','corporate law','civil','criminal','deposition','brief','statute','jurisdiction','due diligence','mergers','acquisitions','employment law'],
  sales: ['revenue','quota','pipeline','prospecting','cold calling','negotiation','crm','salesforce','hubspot','closing','account management','b2b','b2c','lead generation','territory','client relationship','upselling','cross-selling','business development','proposal','rfp','presentation','demo','consultative selling'],
  hr: ['recruitment','onboarding','performance management','employee relations','benefits','compensation','hris','payroll','talent acquisition','diversity','inclusion','training','development','succession planning','labor law','conflict resolution','engagement','retention','workforce planning','interviewing','job description','organizational development'],
  engineering: ['cad','solidworks','autocad','manufacturing','mechanical','electrical','civil','structural','thermodynamics','fluid dynamics','materials','testing','quality','iso','lean','six sigma','project management','construction','blueprint','specifications','prototyping','simulation','matlab','ansys','plc','automation'],
  hospitality: ['customer service','guest relations','front desk','reservation','food service','beverage','hotel','restaurant','event planning','catering','housekeeping','concierge','tourism','travel','hospitality management','pos','scheduling','inventory','food safety','servsafe','banquet','menu planning'],
  media: ['writing','editing','journalism','reporting','content creation','video production','photography','podcasting','publishing','broadcasting','social media','wordpress','cms','ap style','interviewing','storytelling','press release','media relations','fact-checking','deadline','beat reporting','investigative'],
};

function matchesWord(lower, skill) {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(lower);
}

function detectField(lower) {
  let best = 'general';
  let bestCount = 0;
  for (const [field, skills] of Object.entries(FIELD_SKILLS)) {
    const count = skills.filter(s => matchesWord(lower, s)).length;
    if (count > bestCount) { bestCount = count; best = field; }
  }
  return { field: best, matchCount: bestCount };
}

function extractMatchedSkills(lower) {
  const all = [];
  for (const skills of Object.values(FIELD_SKILLS)) {
    for (const s of skills) {
      if (matchesWord(lower, s) && !all.includes(s)) all.push(s);
    }
  }
  return all;
}

// ─── Dynamic local resume analyzer ─────────────────────────────────────────

function analyzeResumeLocally(resumeText) {
  const text = resumeText || '';
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Sections
  const sections = {
    summary: /\b(summary|objective|profile|about\s*me|introduction)\b/i.test(text),
    experience: /\b(experience|work\s*history|employment|professional\s*experience|work\s*experience)\b/i.test(text),
    education: /\b(education|academic|qualification|degree|university|college)\b/i.test(text),
    skills: /\b(skills|competencies|proficiencies|expertise|tools)\b/i.test(text),
    projects: /\b(projects|portfolio|key\s*projects)\b/i.test(text),
    certifications: /\b(certifications?|licenses?|credentials?)\b/i.test(text),
    awards: /\b(awards?|honors?|achievements?|recognition|accomplishments?)\b/i.test(text),
    volunteer: /\b(volunteer|community|nonprofit|ngo)\b/i.test(text),
    publications: /\b(publications?|research|papers?|journal)\b/i.test(text),
    languages: /\b(languages?|bilingual|multilingual|fluent)\b/i.test(text),
  };
  const sectionCount = Object.values(sections).filter(Boolean).length;

  // Contact
  const hasEmail = /[\w.-]+@[\w.-]+\.\w{2,}/.test(text);
  const hasPhone = /(\+?\d[\d\s\-().]{7,}\d)/.test(text);
  const hasLinkedIn = /linkedin/i.test(text);
  const hasOnlinePresence = /github|portfolio|behance|dribbble|medium|website|blog/i.test(text);

  // Field detection
  const { field } = detectField(lower);
  const detectedSkills = extractMatchedSkills(lower);

  // Metrics
  const metrics = text.match(/(\d+[%x]|\$[\d,.]+|\d+\+?\s*(users?|customers?|clients?|patients?|students?|employees?|transactions?|projects?|cases?|accounts?)|\d+\s*%\s*(increase|decrease|reduction|improvement|growth|savings?)|\brevenue\b|\bsaved\b.*\d|\d+\s*(years?|months?))/gi) || [];

  // Action verbs
  const verbs = ['led','managed','built','developed','designed','implemented','created','launched','optimized','improved','reduced','increased','architected','deployed','mentored','collaborated','delivered','automated','streamlined','spearheaded','initiated','transformed','scaled','established','negotiated','resolved','analyzed','coordinated','supervised','trained','facilitated','organized','planned','executed','directed','oversaw','maintained','researched','published','presented','counseled','diagnosed','treated','taught','instructed','evaluated','assessed','audited','compiled','documented'];
  const usedVerbs = verbs.filter(v => lower.includes(v));

  // Titles from resume
  const titlePatterns = /\b(engineer|developer|designer|manager|analyst|consultant|architect|lead|intern|director|associate|specialist|coordinator|nurse|doctor|physician|teacher|professor|accountant|attorney|lawyer|therapist|scientist|researcher|writer|editor|chef|officer|administrator|assistant|executive|supervisor|technician|pharmacist|counselor|recruiter|planner|strategist|agent)\b/gi;
  const titles = [...new Set((text.match(titlePatterns) || []).map(t => t.trim()))];

  // Degree
  const hasDegree = /\b(b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|m\.?b\.?a|ph\.?d|bachelor|master|doctor|associate|diploma|b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?|b\.?com|m\.?com|b\.?sc|m\.?sc|bba|bca|mca)\b/i.test(text);

  // ── Scoring ──
  let score = 25;
  if (sections.summary) score += 5;
  if (sections.experience) score += 8;
  if (sections.education) score += 5;
  if (sections.skills) score += 5;
  if (sections.projects) score += 3;
  if (sections.certifications) score += 3;
  if (sections.awards) score += 2;
  if (sections.volunteer) score += 2;
  if (sections.publications) score += 2;
  if (hasEmail) score += 3;
  if (hasPhone) score += 2;
  if (hasLinkedIn) score += 3;
  if (hasOnlinePresence) score += 2;
  if (detectedSkills.length >= 10) score += 15;
  else if (detectedSkills.length >= 6) score += 10;
  else if (detectedSkills.length >= 3) score += 6;
  else if (detectedSkills.length >= 1) score += 3;
  if (metrics.length >= 4) score += 10;
  else if (metrics.length >= 2) score += 6;
  else if (metrics.length >= 1) score += 3;
  if (usedVerbs.length >= 6) score += 5;
  else if (usedVerbs.length >= 3) score += 3;
  if (wordCount >= 200 && wordCount <= 900) score += 5;
  else if (wordCount >= 100) score += 2;
  else score -= 5;
  if (hasDegree) score += 4;
  score = Math.max(10, Math.min(98, score));

  // ── Field label for display ──
  const fieldLabel = field === 'general' ? 'Professional' : field.charAt(0).toUpperCase() + field.slice(1);

  // ── Feedback ──
  const feedback = [];

  if (detectedSkills.length >= 5) {
    feedback.push(`Strong ${fieldLabel.toLowerCase()} skill set with ${detectedSkills.length} relevant competencies including ${detectedSkills.slice(0, 3).join(', ')}.`);
  } else if (detectedSkills.length > 0) {
    feedback.push(`Only ${detectedSkills.length} relevant skill(s) detected (${detectedSkills.join(', ')}). Expand your Skills section with more specific ${fieldLabel.toLowerCase()} competencies.`);
  } else {
    feedback.push(`No specific ${fieldLabel.toLowerCase()} skills detected. Add a clear Skills section listing your core competencies, tools, and certifications.`);
  }

  if (metrics.length >= 2) {
    feedback.push('Excellent use of quantified results — numbers help hiring managers see your real impact quickly.');
  } else {
    feedback.push('Add measurable achievements (e.g., "Increased sales by 30%", "Managed 50+ accounts", "Reduced wait time by 15 minutes"). Numbers make your impact tangible.');
  }

  if (!sections.summary) {
    feedback.push('Add a Summary or Objective section at the top — it gives recruiters a quick snapshot of who you are and what you bring.');
  } else {
    feedback.push('Good Summary section — tailor it to each specific role you apply for to maximize relevance.');
  }

  if (!hasLinkedIn && !hasOnlinePresence) {
    feedback.push('Include a LinkedIn profile or relevant online presence (portfolio, GitHub, Behance, etc.) to let employers learn more about you.');
  } else {
    const links = [hasLinkedIn && 'LinkedIn', hasOnlinePresence && 'online portfolio/profile'].filter(Boolean);
    feedback.push(`Good inclusion of ${links.join(' and ')}. Make sure they are up-to-date and consistent with your resume.`);
  }

  if (usedVerbs.length < 3) {
    feedback.push('Start your bullet points with strong action verbs (e.g., "Managed", "Designed", "Delivered", "Coordinated") to sound more results-oriented.');
  } else {
    feedback.push(`Effective use of action verbs like "${usedVerbs.slice(0, 3).join('", "')}". This gives your experience a strong, results-driven tone.`);
  }

  if (!sections.certifications && (field === 'healthcare' || field === 'finance' || field === 'legal' || field === 'hr')) {
    feedback.push(`In the ${fieldLabel.toLowerCase()} field, certifications are highly valued. Consider adding a Certifications section if you hold any.`);
  }
  if (wordCount < 150) {
    feedback.push('Your resume is quite short. Aim for 300-600 words to adequately showcase your experience and skills.');
  } else if (wordCount > 900) {
    feedback.push('Your resume may be too long. Focus on the most relevant and recent experience to keep it to 1-2 pages.');
  }

  // ── Interview Questions (field-aware, resume-specific) ──
  const questions = [];
  const topSkill = detectedSkills.length > 0 ? detectedSkills[0] : null;
  const secondSkill = detectedSkills.length > 1 ? detectedSkills[1] : null;
  const mainTitle = titles.length > 0 ? titles[0] : null;

  // Skill-specific question
  if (topSkill) {
    questions.push(`Tell us about a time you applied your ${topSkill} skills to solve a real problem. What was the situation and outcome?`);
  }

  // Title-specific question
  if (mainTitle) {
    questions.push(`As a ${mainTitle}, what do you consider your most significant professional achievement and why?`);
  } else {
    questions.push('What professional accomplishment are you most proud of, and what made it meaningful?');
  }

  // Metrics question
  if (metrics.length > 0) {
    questions.push('You mention measurable results on your resume — can you walk us through how you tracked and achieved one of those outcomes?');
  } else {
    questions.push('How do you typically measure success in your role and track your contributions?');
  }

  // Field-specific questions
  const fieldQuestions = {
    technology: ['Describe a time a project had a major technical blocker. How did you diagnose and resolve it?', 'How do you decide which technologies to use for a new project?'],
    healthcare: ['How do you handle high-pressure situations when multiple patients need urgent attention?', 'Describe a time you had to communicate difficult news to a patient or their family.'],
    finance: ['Walk us through your process for preparing a financial report or analysis from start to finish.', 'How do you ensure accuracy and compliance in your financial work?'],
    marketing: ['Tell us about a campaign you ran — what was your strategy and how did you measure results?', 'How do you stay on top of changing consumer trends and platform algorithms?'],
    education: ['How do you adapt your teaching approach for students with different learning styles?', 'Describe a challenging classroom situation and how you resolved it.'],
    design: ['Walk us through your design process from initial brief to final deliverable.', 'How do you handle conflicting feedback from stakeholders on a design?'],
    legal: ['How do you approach a complex legal research task with a tight deadline?', 'Describe a time you had to explain a complicated legal concept to a non-legal audience.'],
    sales: ['Tell us about a deal that was at risk of falling through and how you saved it.', 'How do you build and maintain long-term client relationships?'],
    hr: ['How do you handle a situation where an employee raises a sensitive workplace complaint?', 'Describe your approach to improving employee retention.'],
    engineering: ['Walk us through a project where you had to balance design constraints with practical requirements.', 'How do you ensure quality and safety standards in your engineering work?'],
    hospitality: ['How do you handle a dissatisfied guest and turn the experience around?', 'Describe how you manage peak-hour pressure while maintaining service quality.'],
    media: ['Tell us about a story or piece of content you produced that had significant impact.', 'How do you manage multiple deadlines without sacrificing quality?'],
    general: ['Tell us about a challenging project and how you overcame obstacles along the way.', 'How do you prioritize tasks when facing competing deadlines?'],
  };

  const fq = fieldQuestions[field] || fieldQuestions.general;
  fq.forEach(q => questions.push(q));

  // Second skill question
  if (secondSkill) {
    questions.push(`How do you stay current with developments in ${secondSkill} and apply new learnings to your work?`);
  }

  // Leadership question if applicable
  if (usedVerbs.includes('led') || usedVerbs.includes('managed') || usedVerbs.includes('supervised') || usedVerbs.includes('mentored')) {
    questions.push('Tell us about your leadership or mentoring experience — how do you bring out the best in your team?');
  }

  questions.push('Where do you see yourself in 3-5 years and how does this role align with your goals?');

  return {
    score,
    feedback: feedback.slice(0, 5),
    interviewQuestions: questions.slice(0, 5),
  };
}

module.exports = {
  analyzeResumeText,
};
