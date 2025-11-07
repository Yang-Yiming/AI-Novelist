
import { GoogleGenAI, Type, FunctionDeclaration, Chat } from "@google/genai";
import { Plan, CheckerFeedback, Chapter } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const planSchema = {
    type: Type.OBJECT,
    properties: {
        worldSettings: {
            type: Type.OBJECT,
            description: "Details about the story's world.",
            properties: {
                summary: { type: Type.STRING, description: "A brief, evocative summary of the world." },
                locations: { type: Type.STRING, description: "Key locations, cities, or landmarks and their descriptions." },
                history: { type: Type.STRING, description: "The relevant history, lore, and timeline of the world." },
                magicSystems: { type: Type.STRING, description: "Rules and nature of magic, technology, or other unique systems. Can be 'None' if not applicable." },
            },
            required: ['summary', 'locations', 'history', 'magicSystems']
        },
        characterSettings: {
            type: Type.ARRAY,
            description: "A list of main and supporting characters.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The character's full name." },
                    description: { type: Type.STRING, description: "Physical appearance, personality, and mannerisms." },
                    motivation: { type: Type.STRING, description: "The character's primary goals, desires, and fears." },
                },
                required: ['name', 'description', 'motivation']
            }
        },
        plotOutline: {
            type: Type.ARRAY,
            description: "A chapter-by-chapter or act-by-act outline of the plot.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "The title of the chapter or act (e.g., 'Chapter 1: The Discovery')." },
                    description: { type: Type.STRING, description: "A summary of the key events, conflicts, and resolutions in this part of the story." },
                },
                required: ['title', 'description']
            }
        },
        tone: { type: Type.STRING, description: "The overall tone and mood of the novel, e.g., 'Dark Fantasy', 'Lighthearted Sci-Fi', 'Gritty Noir'." },
    },
    required: ['worldSettings', 'characterSettings', 'plotOutline', 'tone'],
};

const feedbackSchema = {
    type: Type.OBJECT,
    properties: {
        verdict: {
            type: Type.STRING,
            enum: ['Approved', 'Needs Revision'],
            description: "A simple one-word verdict on whether the chapter is good to go or needs work."
        },
        thoughts: {
            type: Type.OBJECT,
            properties: {
                overallImpression: { type: Type.STRING, description: "A one-sentence overall impression of the chapter." },
                detailedFeedback: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "A list of specific, actionable feedback points."
                },
            },
            required: ['overallImpression', 'detailedFeedback'],
        }
    },
    required: ['verdict', 'thoughts'],
};

const parseAndPreparePlan = (jsonText: string): Plan => {
    try {
        const plan = JSON.parse(jsonText) as Plan;
        plan.characterSettings = plan.characterSettings || [];
        plan.plotOutline = plan.plotOutline || [];

        plan.characterSettings.forEach(c => c.id = c.id || self.crypto.randomUUID());
        plan.plotOutline.forEach(p => p.id = p.id || self.crypto.randomUUID());
        return plan;
    } catch (e) {
        console.error("Failed to parse plan JSON:", jsonText, e);
        throw new Error("The AI returned an invalid format for the plan.");
    }
}

export const generatePlan = async (idea: string, globalSystemPrompt: string): Promise<Plan> => {
    const prompt = `${globalSystemPrompt}\n\nYou are a master storyteller and world-builder. Based on the user's idea: "${idea}", generate a detailed, structured plan for a novel. Create a JSON object with four top-level keys: 'worldSettings', 'characterSettings', 'plotOutline', and 'tone'.
- 'worldSettings' should be an object with keys: 'summary', 'locations', 'history', and 'magicSystems'.
- 'characterSettings' should be an array of objects, each with 'name', 'description', and 'motivation'.
- 'plotOutline' should be an array of objects, each representing a chapter or act, with 'title' and 'description'.
- 'tone' should be a string describing the novel's mood.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: planSchema,
        },
    });

    const jsonText = response.text.trim();
    return parseAndPreparePlan(jsonText);
};

export const refinePlan = async (currentPlan: Plan, refinementPrompt: string, globalSystemPrompt: string): Promise<Plan> => {
    const prompt = `${globalSystemPrompt}\n\nYou are a master storyteller. A user wants to refine their structured novel plan.
The user's request for change is: "${refinementPrompt}".

Based on this request, regenerate the entire plan, keeping the same JSON structure.

Current Plan:
${JSON.stringify(currentPlan, null, 2)}
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: planSchema,
        },
    });

    const jsonText = response.text.trim();
    return parseAndPreparePlan(jsonText);
};

function formatPlanForPrompt(plan: Plan): string {
  const world = `**World Settings:**
- Summary: ${plan.worldSettings.summary}
- Key Locations: ${plan.worldSettings.locations}
- History/Lore: ${plan.worldSettings.history}
- Magic/Systems: ${plan.worldSettings.magicSystems}`;

  const characters = plan.characterSettings.map(c => 
    `- **${c.name}:** ${c.description}\n  *Motivation:* ${c.motivation}`
  ).join('\n\n');

  const plot = plan.plotOutline.map(p => 
    `- **${p.title}:** ${p.description}`
  ).join('\n');

  return `
${world}

**Character Settings:**
${characters}

**Plot Outline:**
${plot}

**Tone:**
${plan.tone}
  `;
}


export const writeChapter = async (plan: Plan, chapterNumber: number, previousChaptersSummary: string, lastChapterContentSnippet: string | null, globalSystemPrompt: string): Promise<string> => {
    const formattedPlan = formatPlanForPrompt(plan);
    const prompt = `${globalSystemPrompt}\n\nYou are a professional novelist. Your task is to write the next chapter of a story. Adhere strictly to the established context. Do not introduce new characters or plot points that contradict the plan.

${formattedPlan}

${previousChaptersSummary ? `**Previous Chapters Summary:**\n${previousChaptersSummary}\n` : ''}
${lastChapterContentSnippet ? `**The last paragraph of the previous chapter ended like this, continue from here:**\n...\n${lastChapterContentSnippet}\n` : ''}
Now, write Chapter ${chapterNumber} following the outline. The chapter should be engaging, match the established tone, and move the story forward.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
    });
    return response.text;
};

const readChapterContent: FunctionDeclaration = {
    name: 'readChapterContent',
    parameters: {
        type: Type.OBJECT,
        description: "Reads the content of a specific chapter. Can optionally read only the last N words.",
        properties: {
            chapterNumber: { type: Type.INTEGER, description: "The number of the chapter to read (e.g., 1, 2)." },
            lastWords: { type: Type.INTEGER, description: "Optional. If provided, returns only the last N words of the chapter." }
        },
        required: ['chapterNumber']
    }
};

const findInManuscript: FunctionDeclaration = {
    name: 'findInManuscript',
    parameters: {
        type: Type.OBJECT,
        description: "Searches the entire manuscript for a text string (like grep). Returns a list of matches with chapter number and context.",
        properties: {
            query: { type: Type.STRING, description: "The text to search for." },
            caseSensitive: { type: Type.BOOLEAN, description: "Optional. Whether the search should be case-sensitive. Defaults to false." }
        },
        required: ['query']
    }
};

const replaceInChapter: FunctionDeclaration = {
    name: 'replaceInChapter',
    parameters: {
        type: Type.OBJECT,
        description: "Replaces the first occurrence of a text string with a new one within the chapter currently being revised. THIS TOOL CAN ONLY BE USED ON THE CURRENT CHAPTER.",
        properties: {
            oldText: { type: Type.STRING, description: "The exact text snippet to be replaced." },
            newText: { type: Type.STRING, description: "The new text to insert." }
        },
        required: ['oldText', 'newText']
    }
};


export const reviseChapter = async (plan: Plan, chapters: Chapter[], chapterIndex: number, revisionPrompt: string, globalSystemPrompt: string): Promise<string> => {
    const formattedPlan = formatPlanForPrompt(plan);
    const chapterToRevise = chapters[chapterIndex];
    let currentChapterContent = chapterToRevise.content;

    const chat: Chat = ai.chats.create({
        model: 'gemini-2.5-pro',
        config: {
            tools: [{ functionDeclarations: [readChapterContent, findInManuscript, replaceInChapter] }],
        },
    });

    const prompt = `${globalSystemPrompt}\n\nYou are a professional novelist and editor. Your task is to revise a chapter based on the user's instructions.
You have access to tools to help you: 'readChapterContent', 'findInManuscript', and 'replaceInChapter'.
- Use 'readChapterContent' to look at other chapters for context.
- Use 'findInManuscript' to locate specific names or phrases across all chapters.
- Use 'replaceInChapter' for small, targeted text replacements. Note: this tool only works on the current chapter being revised.
After using tools, you must provide the complete, revised text for the chapter as your final answer. Output only the final chapter text.

${formattedPlan}

**User's Revision Request:**
${revisionPrompt}

**Original Chapter Text to Revise (Chapter ${chapterToRevise.id}):**
---
${currentChapterContent}
---

Now, begin your revision process.`;

    const MAX_TURNS = 5;
    let response = await chat.sendMessage({ message: prompt });

    for (let i = 0; i < MAX_TURNS; i++) {
        const functionCalls = response.functionCalls;
        if (!functionCalls || functionCalls.length === 0) {
            break; // Model is done with tools.
        }

        const toolResponses = [];

        for (const call of functionCalls) {
            let result: any;
            try {
                switch (call.name) {
                    case 'readChapterContent': {
                        const { chapterNumber, lastWords } = call.args;
                        if (chapterNumber < 1 || chapterNumber > chapters.length) {
                           result = `Error: Invalid chapter number. There are only ${chapters.length} chapters.`;
                        } else {
                            let content = chapters[chapterNumber - 1].content;
                            if (lastWords) {
                                content = content.split(' ').slice(-lastWords).join(' ');
                            }
                            result = content;
                        }
                        break;
                    }
                    case 'findInManuscript': {
                        const { query, caseSensitive = false } = call.args;
                        const findings: string[] = [];
                        chapters.forEach((chapter, idx) => {
                            const content = caseSensitive ? chapter.content : chapter.content.toLowerCase();
                            const searchQuery = caseSensitive ? query : query.toLowerCase();
                            if (content.includes(searchQuery)) {
                                findings.push(`Found in Chapter ${idx + 1}.`);
                            }
                        });
                        result = findings.length > 0 ? findings.join('\n') : `'${query}' not found in any chapter.`;
                        break;
                    }
                    case 'replaceInChapter': {
                        const { oldText, newText } = call.args;
                        if (currentChapterContent.includes(oldText)) {
                            currentChapterContent = currentChapterContent.replace(oldText, newText);
                            result = `Replacement successful. The chapter content has been updated.`;
                        } else {
                            result = `Error: The text snippet to be replaced was not found in the current chapter.`;
                        }
                        break;
                    }
                    default:
                        result = `Error: Unknown tool '${call.name}'`;
                }
            } catch (e: any) {
                result = `Error executing tool: ${e.message}`;
            }

            toolResponses.push({
                functionResponses: {
                    id: call.id,
                    name: call.name,
                    response: { result: result },
                }
            });
        }
        
        response = await chat.sendMessage({ toolResponses });
    }

    // After the loop, the model should give the final text. If not, return the last known state of the content.
    return response.text || currentChapterContent;
};


export const checkChapter = async (plan: Plan, chapterContent: string, globalSystemPrompt: string): Promise<CheckerFeedback> => {
    const formattedPlan = formatPlanForPrompt(plan);
    const prompt = `${globalSystemPrompt}\n\nYou are a meticulous story editor. Your job is to review a chapter. Compare it against the provided settings, plot outline, and tone. Check for consistency, pacing, character voice, and proper handling of foreshadowing.

Generate feedback as a JSON object with two keys: 'verdict' and 'thoughts'.
- For 'verdict', provide a simple one-word assessment: either "Approved" if the chapter is consistent and well-written, or "Needs Revision" if there are issues.
- For 'thoughts', provide an object containing 'overallImpression' (a one-sentence summary of your feedback) and 'detailedFeedback' (a list of specific, constructive points).

${formattedPlan}

**Chapter Text to Review:**
${chapterContent}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: feedbackSchema,
        },
    });
    
    const jsonText = response.text.trim();
    try {
        return JSON.parse(jsonText) as CheckerFeedback;
    } catch (e) {
        console.error("Failed to parse feedback JSON:", jsonText);
        throw new Error("The AI returned an invalid format for the feedback.");
    }
};

export const syncPlanWithChapterContent = async (plan: Plan, chapterToSync: Chapter, globalSystemPrompt: string): Promise<Plan> => {
    const prompt = `${globalSystemPrompt}\n\nYou are a meticulous novel planner. The user has updated a chapter's content, and you need to update the novel's blueprint (the plan) to match.

Your task is to rewrite the 'description' of the plot point for Chapter ${chapterToSync.id} to be consistent with its new content. Do not change any other part of the plan. Output the entire, updated plan as a single JSON object.

**Current Plan:**
---
${JSON.stringify(plan, null, 2)}
---

**New Content for ${chapterToSync.title}:**
---
${chapterToSync.content}
---

Now, provide the complete and updated JSON for the entire plan.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: planSchema,
        },
    });

    const jsonText = response.text.trim();
    return parseAndPreparePlan(jsonText);
};