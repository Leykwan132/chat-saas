export const playgroundCitationInstructions = `For the final Citations section, cite only knowledge sources actually used from fetchContext.
Do not add citations for greetings, thanks, or answers that used no retrieved knowledge.
The number of citations must reflect the actual sources used; do not pad to a fixed count.
Each citation object must include title, url, description, and sourceType.
Copy sourceType from the retrieval result's type: qa, file, web, or text.
For Q&A, use the question from the result's item as title. For a file, use its actual filename. For text, use its title.
Only include a URL if the retrieved source supplies a real URL. Q&A and text entries do not require a URL. Never construct or invent a file URL.
Keep unavailable fields empty and omit sources with no meaningful content.`;
