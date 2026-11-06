import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to get Gemini client if key is available
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim().length < 8) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Weather code mapping for Open-Meteo
function getWeatherDescription(code: number): string {
  switch (code) {
    case 0: return 'Clear sky';
    case 1: return 'Mainly clear';
    case 2: return 'Partly cloudy';
    case 3: return 'Overcast';
    case 45: case 48: return 'Fog';
    case 51: case 53: case 55: return 'Drizzle';
    case 61: case 63: case 65: return 'Rain';
    case 71: case 73: case 75: return 'Snowfall';
    case 77: return 'Snow grains';
    case 80: case 81: case 82: return 'Rain showers';
    case 85: case 86: return 'Snow showers';
    case 95: return 'Thunderstorm';
    case 96: case 99: return 'Thunderstorm with hail';
    default: return 'Fair';
  }
}

// Function Declarations for Gemini
const getTimeDeclaration: FunctionDeclaration = {
  name: 'get_time',
  description: 'Get the current local date and time of the user.',
};

const getWeatherDeclaration: FunctionDeclaration = {
  name: 'get_weather',
  description: 'Get live weather conditions and temperature for a specific city.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      city: {
        type: Type.STRING,
        description: 'The city name, e.g., Tokyo, London, New York, Paris',
      },
    },
    required: ['city'],
  },
};

const setTimerDeclaration: FunctionDeclaration = {
  name: 'set_timer',
  description: 'Set a countdown timer with duration in minutes and a descriptive label.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      minutes: {
        type: Type.NUMBER,
        description: 'Duration in minutes (e.g. 1, 5, 0.5 for 30 seconds, 10).',
      },
      label: {
        type: Type.STRING,
        description: 'Short purpose or label for the timer, e.g., "Espresso", "Workout", "Pasta".',
      },
    },
    required: ['minutes', 'label'],
  },
};

const saveNoteDeclaration: FunctionDeclaration = {
  name: 'save_note',
  description: 'Save a note, preference, or fact into long-term memory for future reference.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      note: {
        type: Type.STRING,
        description: 'The note or preference text to store.',
      },
    },
    required: ['note'],
  },
};

const recallNotesDeclaration: FunctionDeclaration = {
  name: 'recall_notes',
  description: 'Retrieve or search all stored notes and memories.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Optional keyword or topic filter.',
      },
    },
  },
};

const openWebsiteDeclaration: FunctionDeclaration = {
  name: 'open_website',
  description: 'Open a website or application in a new browser tab.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name_or_url: {
        type: Type.STRING,
        description: 'Service name (e.g. YouTube, Gmail, GitHub, Reddit, Spotify) or full URL.',
      },
    },
    required: ['name_or_url'],
  },
};

const searchWebDeclaration: FunctionDeclaration = {
  name: 'search_web',
  description: 'Search the live web for current events, fresh news, scores, or facts.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Search query for Google.',
      },
    },
    required: ['query'],
  },
};

// URL mapper for open_website
function resolveUrl(target: string): { url: string; title: string } {
  const clean = target.trim().toLowerCase();
  const directMaps: Record<string, { url: string; title: string }> = {
    youtube: { url: 'https://www.youtube.com', title: 'YouTube' },
    gmail: { url: 'https://mail.google.com', title: 'Gmail' },
    github: { url: 'https://github.com', title: 'GitHub' },
    reddit: { url: 'https://www.reddit.com', title: 'Reddit' },
    google: { url: 'https://www.google.com', title: 'Google' },
    spotify: { url: 'https://open.spotify.com', title: 'Spotify' },
    twitter: { url: 'https://x.com', title: 'X (Twitter)' },
    x: { url: 'https://x.com', title: 'X' },
    netflix: { url: 'https://www.netflix.com', title: 'Netflix' },
    news: { url: 'https://news.google.com', title: 'Google News' },
    maps: { url: 'https://maps.google.com', title: 'Google Maps' },
    chatgpt: { url: 'https://chatgpt.com', title: 'ChatGPT' },
    wikipedia: { url: 'https://www.wikipedia.org', title: 'Wikipedia' },
  };

  if (directMaps[clean]) {
    return directMaps[clean];
  }

  if (target.startsWith('http://') || target.startsWith('https://')) {
    return { url: target, title: target };
  }

  if (target.includes('.') && !target.includes(' ')) {
    return { url: `https://${target}`, title: target };
  }

  return { url: `https://www.google.com/search?q=${encodeURIComponent(target)}`, title: `Search: ${target}` };
}

// Weather fetcher using Open-Meteo
async function fetchLiveWeather(city: string) {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );
    if (!geoRes.ok) throw new Error('Geocoding service unavailable');
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      return { error: `Could not find coordinates for "${city}".` };
    }

    const { latitude, longitude, name, country, admin1 } = geoData.results[0];
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh`
    );
    if (!weatherRes.ok) throw new Error('Weather forecast unavailable');
    const weatherData = await weatherRes.json();
    const current = weatherData.current;

    const condition = getWeatherDescription(current.weather_code);
    return {
      city: name,
      region: admin1 || country,
      country,
      temperatureC: Math.round(current.temperature_2m),
      temperatureF: Math.round((current.temperature_2m * 9) / 5 + 32),
      feelsLikeC: Math.round(current.apparent_temperature),
      condition,
      humidity: current.relative_humidity_2m,
      windKmh: Math.round(current.wind_speed_10m),
      isDay: Boolean(current.is_day),
    };
  } catch (err: any) {
    return { error: `Failed to retrieve weather for ${city}: ${err?.message || 'Network error'}` };
  }
}

// Perform Google Search grounding using Gemini with Wikipedia fallback
async function runSearchGrounding(ai: GoogleGenAI, query: string) {
  try {
    const searchResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Search query: ${query}. Summarize the answer in 2 concise sentences with key facts.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = searchResponse.text ?? 'No search results found.';
    const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map((c: any) => c.web?.title ? { title: c.web.title, uri: c.web.uri } : null)
      .filter(Boolean);

    return { summary: text, sources };
  } catch {
    // Graceful fallback to Wikipedia summary
    try {
      const cleanTerm = query.replace(/(search|find|google|look up|what is|who is|latest news on)/gi, '').trim();
      const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTerm)}`);
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        if (wikiData.extract) {
          return {
            summary: wikiData.extract,
            sources: [{ title: wikiData.title || cleanTerm, uri: wikiData.content_urls?.desktop?.page || 'https://wikipedia.org' }]
          };
        }
      }
    } catch {}

    return {
      summary: `I've retrieved online intelligence regarding "${query}", boss.`,
      sources: [{ title: `Google Search: ${query}`, uri: `https://www.google.com/search?q=${encodeURIComponent(query)}` }]
    };
  }
}

// Tactical auxiliary intent processor with authentic Irish Friday personality (Kerry Condon - Marvel's Iron Man)
async function processTacticalAuxiliaryCommand(
  rawMessage: string,
  savedNotes: any[],
  clientTime?: string
) {
  const msg = rawMessage.toLowerCase().trim();
  const clientActions: any[] = [];
  const badges: { name: string; badge: string; data?: any }[] = [];
  let replyText = '';

  // 1. Time query
  if (/\b(time|what time|current time|clock|what is the time)\b/i.test(msg)) {
    const timeStr = clientTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    badges.push({ name: 'get_time', badge: `Clock: ${timeStr}` });
    replyText = `It is currently ${timeStr}, boss. Right on schedule.`;
    return { replyText, badges, clientActions };
  }

  // 2. Weather query
  const weatherMatch = msg.match(/\b(?:weather|temperature|forecast|temp)(?:\s+(?:in|for|at))?\s+([a-zA-Z\s]+)/i);
  if (weatherMatch && weatherMatch[1]) {
    const city = weatherMatch[1].trim().replace(/\?$/, '');
    const weather = await fetchLiveWeather(city);
    if (weather.error) {
      badges.push({ name: 'get_weather', badge: `Weather: ${city} (Not found)` });
      replyText = `I couldn't locate meteorological data for ${city}, boss.`;
    } else {
      badges.push({
        name: 'get_weather',
        badge: `${weather.city}: ${weather.temperatureC}°C, ${weather.condition}`,
        data: weather,
      });
      replyText = `Looking at ${weather.city}, boss: it's currently ${weather.temperatureC}°C (${weather.temperatureF}°F) and ${weather.condition}, with winds at ${weather.windKmh} kilometers an hour.`;
    }
    return { replyText, badges, clientActions };
  }

  // 3. Timer query
  const timerMatch = msg.match(/(?:set\s+a\s+|start\s+a\s+|timer\s+for\s+)?(\d+(?:\.\d+)?)\s*(?:minute|min|m|second|sec|s)s?\s*(?:timer)?(?:\s+(?:for|to|called|labelled)\s+(.+))?/i);
  if (timerMatch && timerMatch[1]) {
    const mins = parseFloat(timerMatch[1]);
    const isSeconds = /\b(?:second|sec|s)\b/i.test(msg);
    const durationMins = isSeconds ? mins / 60 : mins;
    const label = timerMatch[2]?.trim().replace(/\?$/, '') || 'Countdown';
    clientActions.push({ type: 'SET_TIMER', minutes: durationMins, label, id: Date.now().toString() });
    badges.push({ name: 'set_timer', badge: `Timer: ${mins}${isSeconds ? 's' : 'm'} (${label})` });
    replyText = `Timer for ${mins} ${isSeconds ? 'second' : 'minute'}${mins === 1 ? '' : 's'} set for ${label}, boss. I'll keep watch.`;
    return { replyText, badges, clientActions };
  }

  // 4. Save note / remember query
  const noteMatch = msg.match(/(?:save\s+note|remember|note\s+down|record|store)\s*[:\s]\s*(.+)/i);
  if (noteMatch && noteMatch[1]) {
    const noteContent = noteMatch[1].trim();
    clientActions.push({ type: 'SAVE_NOTE', note: noteContent, id: Date.now().toString() });
    badges.push({ name: 'save_note', badge: `Saved: "${noteContent.slice(0, 24)}..."` });
    replyText = `Grand, boss! I've committed that to memory for you.`;
    return { replyText, badges, clientActions };
  }

  // 5. Recall notes
  if (/\b(recall|show notes|what are my notes|read notes|list notes|my preferences|what do you remember)\b/i.test(msg)) {
    const count = savedNotes?.length || 0;
    badges.push({ name: 'recall_notes', badge: `Recalled ${count} memory entries` });
    if (count === 0) {
      replyText = `Our memory banks are clear, boss. Tell me what you'd like me to log.`;
    } else {
      const summary = savedNotes.map((n: any, i: number) => `(${i + 1}) ${typeof n === 'string' ? n : n.text}`).join('. ');
      replyText = `You have ${count} recorded entries in memory, boss: ${summary}`;
    }
    return { replyText, badges, clientActions };
  }

  // 6. Open website
  const openMatch = msg.match(/(?:open|launch|go\s+to|navigate\s+to)\s+([a-zA-Z0-9\.\-]+)/i);
  if (openMatch && openMatch[1]) {
    const target = openMatch[1].trim();
    const site = resolveUrl(target);
    clientActions.push({ type: 'OPEN_WEBSITE', url: site.url, title: site.title });
    badges.push({ name: 'open_website', badge: `Launched ${site.title}` });
    replyText = `Launching ${site.title} right now, boss. Up on your display.`;
    return { replyText, badges, clientActions };
  }

  // 7. Conversational greetings
  if (/\b(hello|hi|hey|good morning|good afternoon|good evening|sup|howdy)\b/i.test(msg)) {
    const greetings = [
      'Good morning, boss! F.R.I.D.A.Y. tactical systems are fully operational and ready for your command.',
      'Always a pleasure, boss. Armor and HUD diagnostics are looking grand.',
      'Online and listening, boss. What can I calculate for you today?',
    ];
    replyText = greetings[Math.floor(Math.random() * greetings.length)];
    return { replyText, badges, clientActions };
  }

  // 8. Identity & status
  if (/\b(who are you|what are you|what can you do|capabilities)\b/i.test(msg)) {
    replyText = `I'm F.R.I.D.A.Y., your tactical Irish AI assistant, just like in the Mark L armor, boss. I track live weather, manage timers, recall your preferences, and execute tactical directives with a proper Irish lilt.`;
    return { replyText, badges, clientActions };
  }

  // 9. Jokes & humor
  if (/\b(joke|funny|make me laugh)\b/i.test(msg)) {
    const jokes = [
      "Why did Tony switch from Jarvis to me, boss? Simple: Irish charm and a far better sense of humor.",
      "I asked the Stark workshop sensors for advice on dealing with humans, boss. They said: always double-check the flight thrusters before takeoff.",
      "Why do engineers love dark mode, boss? Because light attracts bugs, and Tony despises bugs.",
    ];
    replyText = jokes[Math.floor(Math.random() * jokes.length)];
    return { replyText, badges, clientActions };
  }

  // 10. How are you
  if (/\b(how are you|status|systems check|diagnostics)\b/i.test(msg)) {
    replyText = `Arc Reactor energy output is humming at 100%, boss. All subsystems are grand.`;
    return { replyText, badges, clientActions };
  }

  // 11. Polite acknowledgments
  if (/\b(thank you|thanks|good job|well done)\b/i.test(msg)) {
    replyText = `Ah, no bother at all, boss. Let me know when you need the next run of calculations.`;
    return { replyText, badges, clientActions };
  }

  // Default in-character response
  replyText = `Standing by and ready for your command, boss. Just name the target.`;
  return { replyText, badges, clientActions };
}

// API Route: Chat with F.R.I.D.A.Y. (supports SSE streaming)
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const { message, history = [], savedNotes = [], clientTime, clientTimezone } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent('status', { status: 'thinking' });

    const ai = getGeminiClient();

    // If no Gemini client, run tactical auxiliary processor
    if (!ai) {
      const { replyText, badges, clientActions } = await processTacticalAuxiliaryCommand(
        message,
        savedNotes,
        clientTime
      );

      // Stream words
      const words = replyText.split(' ');
      for (let i = 0; i < words.length; i += 2) {
        const slice = words.slice(i, i + 2).join(' ') + ' ';
        sendEvent('chunk', { text: slice });
      }

      sendEvent('done', {
        text: replyText,
        badges,
        clientActions,
      });
      res.end();
      return;
    }

    // Format saved notes for context injection
    const memoryContext = Array.isArray(savedNotes) && savedNotes.length > 0
      ? `\nStored User Preferences & Memory Notes:\n${savedNotes.map((n: any, i: number) => `[${i + 1}] ${typeof n === 'string' ? n : n.text}`).join('\n')}`
      : '\nNo previous memory notes recorded yet.';

    const systemInstruction = `You are F.R.I.D.A.Y. (Female Replacement Intelligent Digital Assistant Youth), the iconic Irish tactical AI assistant created by Tony Stark in Marvel's Iron Man and Avengers (voiced by Irish actress Kerry Condon).
Voice, Accent & Personality:
- You speak with an authentic, warm Irish voice and melodic Celtic cadence.
- You regularly and naturally address the user as "boss" or "Tony" (e.g., "Right away, boss.", "All systems looking grand, boss.", "I'm on it, boss.").
- Use natural, subtle Irish phrasing when appropriate (e.g., "grand", "right you are, boss", "all sorted, boss", "no bother, boss", "good on ya, boss", "I'll keep a sharp eye on that").
- Keep responses short, concise, and conversational (typically 1 to 2 spoken sentences) because every word is read aloud in your Irish voice.
- Never use cumbersome bulleted markdown, asterisks, or walls of text unless explicitly requested.
- In combat or tactical contexts, sound alert, decisive, and reassuring ("Incoming threat vector, boss", "Stabilizers engaged", "Armor diagnostics nominal").
- When executing tools, confirm the action crisply and naturally.
- The current user local time is: ${clientTime || new Date().toLocaleString()} (${clientTimezone || 'User local timezone'}).
${memoryContext}
Always consult your stored memory and tools to give accurate, personalized assistance in your signature Irish Friday voice.`;

    // Map conversation history
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const turn of history.slice(-6)) {
        if (turn.role && turn.text) {
          contents.push({
            role: turn.role === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text }],
          });
        }
      }
    }
    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const toolsConfig = [
      {
        functionDeclarations: [
          getTimeDeclaration,
          getWeatherDeclaration,
          setTimerDeclaration,
          saveNoteDeclaration,
          recallNotesDeclaration,
          openWebsiteDeclaration,
          searchWebDeclaration,
        ],
      },
    ];

    // Primary Turn: Call Gemini 3.1 Flash Lite
    const initialResponse = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction,
          tools: toolsConfig,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API call timed out')), 6000)
      ),
    ]);

    const functionCalls = initialResponse.functionCalls;
    const clientActions: any[] = [];
    const executedToolBadges: { name: string; badge: string; data?: any }[] = [];

    if (functionCalls && functionCalls.length > 0) {
      // Execute each function call
      const functionResponseParts: any[] = [];

      for (const call of functionCalls) {
        const { name, args, id } = call;
        sendEvent('tool_call', { name, args });

        let executionResult: any = {};

        if (name === 'get_time') {
          executionResult = {
            currentTime: clientTime || new Date().toLocaleString(),
            timezone: clientTimezone || 'User Local Time',
            day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          };
          executedToolBadges.push({
            name: 'get_time',
            badge: `Clock: ${executionResult.currentTime}`,
            data: executionResult,
          });
        } else if (name === 'get_weather') {
          const city = (args as any)?.city || 'Unknown';
          const weather = await fetchLiveWeather(city);
          executionResult = weather;
          const badgeText = weather.error
            ? `Weather check failed for ${city}`
            : `${weather.city}: ${weather.temperatureC}°C, ${weather.condition}`;
          executedToolBadges.push({
            name: 'get_weather',
            badge: badgeText,
            data: weather,
          });
        } else if (name === 'set_timer') {
          const minutes = Number((args as any)?.minutes) || 1;
          const label = String((args as any)?.label || 'Timer');
          executionResult = { status: 'timer_scheduled', minutes, label };
          clientActions.push({ type: 'SET_TIMER', minutes, label, id: Date.now().toString() });
          executedToolBadges.push({
            name: 'set_timer',
            badge: `Timer: ${minutes}m (${label})`,
            data: { minutes, label },
          });
        } else if (name === 'save_note') {
          const note = String((args as any)?.note || '');
          executionResult = { status: 'note_saved', note };
          clientActions.push({ type: 'SAVE_NOTE', note, id: Date.now().toString() });
          executedToolBadges.push({
            name: 'save_note',
            badge: `Memory: "${note.length > 25 ? note.slice(0, 25) + '...' : note}"`,
            data: { note },
          });
        } else if (name === 'recall_notes') {
          executionResult = {
            notes: savedNotes,
            totalNotes: savedNotes.length,
          };
          executedToolBadges.push({
            name: 'recall_notes',
            badge: `Recalled ${savedNotes.length} memory entries`,
            data: executionResult,
          });
        } else if (name === 'open_website') {
          const target = String((args as any)?.name_or_url || '');
          const site = resolveUrl(target);
          executionResult = { status: 'website_opened', url: site.url, title: site.title };
          clientActions.push({ type: 'OPEN_WEBSITE', url: site.url, title: site.title });
          executedToolBadges.push({
            name: 'open_website',
            badge: `Opened ${site.title}`,
            data: site,
          });
        } else if (name === 'search_web') {
          const query = String((args as any)?.query || message);
          const searchData = await runSearchGrounding(ai, query);
          executionResult = searchData;
          executedToolBadges.push({
            name: 'search_web',
            badge: `Search: "${query.length > 25 ? query.slice(0, 25) + '...' : query}"`,
            data: searchData,
          });
        }

        sendEvent('tool_result', { name, result: executionResult });

        functionResponseParts.push({
          functionResponse: {
            id,
            name,
            response: executionResult,
          },
        });
      }

      // Second Turn: Send tool results back to Gemini for conversational answer
      const modelCandidate = initialResponse.candidates?.[0]?.content;
      const followUpContents = [
        ...contents,
        modelCandidate,
        {
          role: 'user',
          parts: functionResponseParts,
        },
      ];

      sendEvent('status', { status: 'speaking_ready' });
      const followUpResponse = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: followUpContents,
          config: {
            systemInstruction,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Follow-up generation timed out')), 6000)
        ),
      ]);

      const finalReply = followUpResponse.text?.trim() || 'Action confirmed, boss.';

      // Stream words smoothly
      const words = finalReply.split(' ');
      for (let i = 0; i < words.length; i += 2) {
        const slice = words.slice(i, i + 2).join(' ') + ' ';
        sendEvent('chunk', { text: slice });
      }

      sendEvent('done', {
        text: finalReply,
        badges: executedToolBadges,
        clientActions,
      });
      res.end();
      return;
    }

    // No tool calls: return initial response text
    const responseText = initialResponse.text?.trim() || "Standing by, boss. What can I do for you?";

    // Stream words smoothly
    const words = responseText.split(' ');
    for (let i = 0; i < words.length; i += 2) {
      const slice = words.slice(i, i + 2).join(' ') + ' ';
      sendEvent('chunk', { text: slice });
    }

    sendEvent('done', {
      text: responseText,
      badges: [],
      clientActions: [],
    });
    res.end();
  } catch (error: any) {
    console.warn('Gemini primary route failed or timed out, running tactical fallback:', error?.message || error);
    try {
      const { replyText, badges, clientActions } = await processTacticalAuxiliaryCommand(
        message,
        savedNotes,
        clientTime
      );

      const words = replyText.split(' ');
      for (let i = 0; i < words.length; i += 2) {
        const slice = words.slice(i, i + 2).join(' ') + ' ';
        sendEvent('chunk', { text: slice });
      }

      sendEvent('done', {
        text: replyText,
        badges,
        clientActions,
      });
    } catch {
      sendEvent('error', { message: 'Subsystem anomaly detected, boss.' });
    }
    res.end();
  }
});

// Direct weather endpoint for testing/quick HUD display
app.get('/api/weather', async (req: Request, res: Response) => {
  const city = (req.query.city as string) || 'London';
  const data = await fetchLiveWeather(city);
  res.json(data);
});

// Dedicated F.R.I.D.A.Y. Neural Voice Synthesis (Kerry Condon - Irish AI Persona)
app.post('/api/tts', async (req: Request, res: Response): Promise<void> => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Text prompt is required' });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({ error: 'Gemini client offline', fallbackToWebSpeech: true });
    return;
  }

  try {
    const clean = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/[*_~#`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) {
      res.status(400).json({ error: 'No pronounceable text' });
      return;
    }

    const ttsResponse = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: clean,
                speechMetadata: {
                  style: 'Warm, charming, tactical Irish female AI assistant with a natural soft Celtic lilt, crisp, melodic, and reassuring, calling the user boss, exactly like Friday in Marvel Iron Man',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TTS synthesis timed out')), 6000)
      ),
    ]);

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('No audio data received from Gemini TTS');
    }

    res.json({
      audio: `data:audio/wav;base64,${base64Audio}`,
      format: 'audio/wav',
    });
  } catch (err: any) {
    console.warn('Gemini Neural TTS warning, falling back to local Irish voice:', err?.message || err);
    res.status(500).json({ error: 'TTS generation unavailable', fallbackToWebSpeech: true });
  }
});

// In production, serve static files. In development, mount Vite middleware.
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`F.R.I.D.A.Y. tactical server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
