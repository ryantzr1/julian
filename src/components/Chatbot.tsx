import React, { useState } from 'react';
import axios from 'axios';
import styles from '../styles/Chatbot.module.css';
require('dotenv').config();

interface Message {
    id: number;
    type: 'user-group' | 'bot';
    texts: string[];
}

const Chatbot: React.FC = () => {
    const [input, setInput] = useState('');

    const [messages, setMessages] = useState<Message[]>([]);

    const handleSend = async () => {
        if (input.trim() === '') return;

        // Generate a unique ID for the message
        const messageId = Date.now();

        // Display the user's message immediately with its ID
        setMessages(prevMessages => [
            ...prevMessages,
            { id: messageId, type: 'user-group', texts: [input, "..."] }
        ]);

        setInput('');

        const replyPrompt = `Engage in a simple conversation in response to the message: '${input}'. Keep it concise and suitable for an A2 English learner.`;

        // Fetch feedback and bot response asynchronously
        const tutorFeedbackPromise = getTutorFeedback(input, messageId);
        const botResponsePromise = getBotResponse(input, replyPrompt);

        // Handle feedback update using the message ID
        tutorFeedbackPromise.then(({ feedback, id }) => {
            setMessages(prevMessages => {
                const targetMessageIndex = prevMessages.findIndex((msg: { id: number }) => msg.id === id);
                if (targetMessageIndex !== -1) {
                    const updatedMessage = {
                        ...prevMessages[targetMessageIndex],
                        texts: [prevMessages[targetMessageIndex].texts[0], feedback]
                    } as { id: number, type: string, texts: string[] };
                    prevMessages[targetMessageIndex] = updatedMessage;
                }
                return [...prevMessages];
            });
        });


        // Update the state with the correct type
        botResponsePromise.then(response => {
            setMessages(prevMessages => [
                ...prevMessages,
                { id: messageId, type: 'bot', texts: [response] }
            ]);
        });
    };

    async function getBotResponse(message: string, instruction: string): Promise<string> {
        return await callOpenAI(message, instruction);
    }

    async function getTutorFeedback(message: string, messageId: number): Promise<{ feedback: string, id: number }> {
        const correctionPrompt = `Review the English sentence: "${message}". If there are significant grammatical or structural errors, start with "Could be improved", then provide a concise corrected English sentence. Else, simply state "No improvements needed." Avoid focusing on minor details like punctuation and capitalization.`;
        const explanationPrompt = `Basándose en la oración en inglés: "${message}", identifica errores significativos de gramática y estructura. Si hay errores, ofrece una breve explicación y sugerencia en inglés. Si la oración está correcta, simplemente afirma "La oración está correcta".`;

        const correction = await callOpenAI(message, correctionPrompt);
        const explanation = await callOpenAI(message, explanationPrompt);

        const combinedFeedback = `${correction}\n\n${explanation}`;

        return { feedback: combinedFeedback, id: messageId };
    }

    async function callOpenAI(message: string, instruction: string): Promise<string> {
        const API_URL = 'https://api.openai.com/v1/chat/completions';
        const API_KEY = process.env.API_KEY;

        const messages = [
            { role: "system", content: instruction },
            { role: "user", content: message }
        ];

        const data = {
            model: "gpt-3.5-turbo",
            messages: messages,
            temperature: 0.7
        };

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        };

        try {
            const response = await axios.post(API_URL, data, { headers });
            return response.data.choices[0].message.content.trim();
        } catch (error) {
            console.error(error);
            return "Sorry, I couldn't understand that.";
        }
    }

    return (
        <div className={styles.App}>
            <div className={styles.chatWindow}>
                {messages.map((message, index) => (
                    message.type === 'user-group' ? (
                        <div key={index} className={`${styles.message} ${styles.user}`}>
                            <p>{message.texts[0]}</p>
                            <p className={styles.feedback}>{message.texts[1]}</p>
                        </div>
                    ) : (
                        <div key={index} className={`${styles.message} ${styles.bot}`}>
                            <p>{message.texts[0]}</p>
                        </div>
                    )
                ))}
            </div>

            <div className={styles.inputArea}>
                <input
                    className="rounded-full py-2 pr-6 pl-10 w-full border border-gray-200 bg-gray-200 focus:bg-white focus:outline-none text-gray-600 focus:shadow-md transition duration-300 ease-in"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                />
                <button className="bg-blue-500 hover:bg-blue-600 text-white rounded px-4 py-2 mt-2" onClick={handleSend}>
                    Send
                </button>
            </div>
        </div>
    );
};

export default Chatbot;
