import { GoogleGenerativeAI } from "@google/generative-ai";

// Generate a high-quality simulated response based on inputs
const generateSimulatedAssessment = (mood, stressLevel, sleepHours, studyHours, concern) => {
  // Simple heuristic calculations
  // High stress, low sleep, high study -> lower score
  // Good sleep (7-9 hrs), moderate study (4-8 hrs), low stress -> higher score
  let baseScore = 100;
  
  // Sleep impact (optimal: 7-9 hours)
  if (sleepHours < 5) baseScore -= 25;
  else if (sleepHours < 7) baseScore -= 10;
  else if (sleepHours > 9) baseScore -= 5;
  
  // Stress impact
  baseScore -= (stressLevel - 1) * 6;
  
  // Study impact (too much or too little is bad)
  if (studyHours > 12) baseScore -= 15; // Burnout warning
  else if (studyHours < 2) baseScore -= 10; // Understudy anxiety
  else if (studyHours >= 4 && studyHours <= 8) baseScore += 5; // Healthy study
  
  // Mood impact
  const lowerMood = mood.toLowerCase();
  if (lowerMood.includes('sad') || lowerMood.includes('depress') || lowerMood.includes('low') || lowerMood.includes('exhaust')) {
    baseScore -= 15;
  } else if (lowerMood.includes('happy') || lowerMood.includes('good') || lowerMood.includes('great') || lowerMood.includes('excit')) {
    baseScore += 10;
  }
  
  const wellnessScore = Math.max(10, Math.min(100, baseScore));
  
  // Determine Burnout Risk
  let burnoutRisk = "Low";
  if (stressLevel >= 8 || studyHours >= 12 || sleepHours < 5) {
    burnoutRisk = "High";
  } else if (stressLevel >= 5 || studyHours >= 9 || sleepHours < 7) {
    burnoutRisk = "Medium";
  }
  
  // Tailor advice based on concern
  let advice = "";
  let dailyPlan = "";
  let motivation = "";
  
  switch(concern) {
    case 'Exam Pressure':
      advice = "Exam pressure is common. Break your subjects into small micro-topics and tackle them one by one. Take regular breaks (like the Pomodoro technique) to prevent cognitive overload. Remember to disconnect from study materials at least an hour before sleep.";
      dailyPlan = "1. Morning: 2 hours of active recall on high-priority topics.\n2. Afternoon: 1 hour solving mock questions with brief intervals.\n3. Evening: Gentle review of notes followed by a 30-minute walk.";
      motivation = "Success in exams is a marathon, not a sprint. Consistency is key, and taking care of your mind is just as important as reading the text!";
      break;
    case 'Result Anxiety':
      advice = "Focus on the input (your effort) rather than the output (results). Practice mindfulness or box breathing (4s inhale, 4s hold, 4s exhale, 4s hold) for 5 minutes when anxiety strikes. Journal your thoughts to externalize worry.";
      dailyPlan = "1. Morning: Light stretching and 10 minutes of breathing exercises.\n2. Day: Study with focused 45-minute blocks. Avoid discussing results with peers.\n3. Evening: Engage in a hobby or listen to relaxing music.";
      motivation = "You are much more than a score or a rank. Your worth is not defined by an exam outcome. Keep giving your best, step-by-step.";
      break;
    case 'Family Pressure':
      advice = "Set boundaries and focus on self-improvement. Communicate your progress and wellness needs clearly but calmly. Find a quiet study environment like a library to distance yourself from high-stress home environments.";
      dailyPlan = "1. Morning: Write down your personal daily goals.\n2. Day: Study in a calm, distraction-free space. Take structured 15-minute breaks.\n3. Evening: Dedicate time to connect with supportive friends or write in a journal.";
      motivation = "This is your journey. Work for your own growth and development. Every step forward counts.";
      break;
    case 'Time Management':
      advice = "Prioritize tasks using the Eisenhower Matrix (urgent vs. important). Eliminate multitasking; focus on one task at a time. Plan your next day's schedule the night before to reduce start-up friction.";
      dailyPlan = "1. Morning: Identify the top 3 critical tasks (MITs) for the day.\n2. Day: Allocate specific time blocks for each MIT and stick to them.\n3. Evening: 15-minute reflection on what was accomplished and plan tomorrow.";
      motivation = "Time is a resource you manage, not an enemy you fight. Take control, one block at a time.";
      break;
    case 'Burnout':
      advice = "You are experiencing signs of burnout. It is crucial to reduce study hours immediately and increase rest. Prioritize sleeping 8+ hours. Engaging in gentle physical activity can help reset your nervous system.";
      dailyPlan = "1. Morning: Leisurely start. Light study for 1 hour max.\n2. Afternoon: 2 hours of reading or passive learning, followed by a long screen break.\n3. Evening: Outdoor activity, mindfulness, and early bedtime.";
      motivation = "Rest is not laziness; it is recovery. You cannot pour from an empty cup. Recharge your mind today.";
      break;
    default:
      advice = "Maintain a balanced routine by planning study periods around your natural energy peaks. Stay hydrated and ensure you are eating balanced meals. Check in with your thoughts daily to notice stress patterns early.";
      dailyPlan = "1. Morning: Focus on complex topics during high energy.\n2. Afternoon: Routine tasks, practice questions, or organizing notes.\n3. Evening: Relaxing activities, connecting with loved ones.";
      motivation = "Every small choice to look after your health builds a strong foundation for future success. Keep going!";
  }
  
  return {
    wellnessScore,
    burnoutRisk,
    advice,
    dailyPlan,
    motivation
  };
};

export const analyzeWellness = async (mood, stressLevel, sleepHours, studyHours, concern) => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    console.warn("GEMINI_API_KEY is missing or invalid. Utilizing high-quality simulated wellness assessment.");
    return generateSimulatedAssessment(mood, stressLevel, sleepHours, studyHours, concern);
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
    
    const prompt = `
You are an expert psychologist, student mentor, wellness coach and productivity advisor.
Analyze the following student wellness metrics and concern:
- Mood: ${mood}
- Stress Level: ${stressLevel} (scale 1-10)
- Sleep Hours: ${sleepHours} hours
- Study Hours: ${studyHours} hours
- Concern: ${concern}

Return ONLY valid JSON that matches the following schema exactly:
{
  "wellnessScore": 0, // A calculated integer from 0 to 100 representing their overall wellbeing
  "burnoutRisk": "", // Either "Low", "Medium", or "High"
  "advice": "", // Short, empathetic advice (2-3 sentences) on how to manage their concern and improve wellness
  "dailyPlan": "", // A brief structured 3-step action plan for their day to improve productivity & mental health
  "motivation": "" // A highly encouraging and motivational sentence (1-2 sentences)
}
`;
    
    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    
    try {
      const jsonResponse = JSON.parse(textResponse);
      return {
        wellnessScore: typeof jsonResponse.wellnessScore === 'number' ? jsonResponse.wellnessScore : 50,
        burnoutRisk: jsonResponse.burnoutRisk || "Medium",
        advice: jsonResponse.advice || "Take care of your health.",
        dailyPlan: jsonResponse.dailyPlan || "1. Sleep well.\n2. Study balanced.\n3. Walk.",
        motivation: jsonResponse.motivation || "You can do this!"
      };
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON output. Using fallback parser.", parseError, textResponse);
      // Attempt manual extraction of JSON if something went wrong
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
      throw parseError;
    }
  } catch (error) {
    console.error("Gemini AI API Call failed. Falling back to simulated assessment:", error.message);
    return generateSimulatedAssessment(mood, stressLevel, sleepHours, studyHours, concern);
  }
};
