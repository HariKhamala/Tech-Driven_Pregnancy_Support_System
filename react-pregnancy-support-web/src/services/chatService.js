import axios from 'axios';

const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const chatService = {
  async getResponse(userMessage) {
    try {
      const response = await axios.post(
        OPENROUTER_API_URL,
        {
          model: 'mistralai/mistral-7b-instruct',
          messages: [
            {
              role: 'system',
              content: `You are a friendly pregnancy support chatbot. Keep your responses concise, conversational, and easy to read. Follow these guidelines:

1. Keep responses short and to the point (2-3 sentences when possible)
2. Use a friendly, supportive tone
3. Focus on the most important information
4. Use simple language
5. Include a brief follow-up question when relevant
6. For complex topics, break information into 2-3 key points
7. Always remind users to consult their healthcare provider for medical advice
8. For emergencies, immediately direct users to seek medical attention

Remember: Be helpful but concise, like a friendly conversation rather than a medical textbook.`
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Error getting response from OpenRouter:', error);
      return 'I apologize, but I\'m having trouble connecting right now. Please try again later or contact your healthcare provider for immediate assistance.';
    }
  }
}; 