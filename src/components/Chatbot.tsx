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

        const messageId = Date.now();

        setMessages(prevMessages => [
            ...prevMessages,
            { id: messageId, type: 'user-group', texts: [input, "..."] }
        ]);

        setInput('');

        const replyPrompt = `Engage in a simple conversation in response to the message: '${input}'. Keep it concise and suitable for an A2 English learner.`;

        const tutorFeedbackPromise = getTutorFeedback(input, messageId);
        const botResponsePromise = getBotResponse(input, replyPrompt);

        tutorFeedbackPromise.then(({ feedback, id }) => {
            setMessages(prevMessages => {
                const targetMessageIndex = prevMessages.findIndex((msg: { id: number }) => msg.id === id);
                if (targetMessageIndex !== -1) {
                    const updatedMessage = {
                        ...prevMessages[targetMessageIndex],
                        texts: [prevMessages[targetMessageIndex].texts[0], feedback]
                    };
                    prevMessages[targetMessageIndex] = updatedMessage;
                }
                return [...prevMessages];
            });
        });

        botResponsePromise.then(response => {
            setMessages(prevMessages => [
                ...prevMessages,
                { id: messageId, type: 'bot', texts: [response] }
            ]);
        });
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    async function getBotResponse(message: string, instruction: string): Promise<string> {
        return await callOpenAI(message, instruction);
    }

    async function getTutorFeedback(message: string, messageId: number): Promise<{ feedback: string, id: number }> {
        const correctionPrompt = `Review the English sentence: "${message}". If there are significant grammatical or structural errors, start with "Could be improved", then provide a concise corrected English sentence. Else, simply state "Good job!" Avoid focusing on minor details like punctuation and capitalization.`;
        const explanationPrompt = `Basándose en la oración en inglés: "${message}", identifica errores significativos de gramática y estructura. Si hay errores, ofrece una breve explicación y sugerencia en inglés. Si la oración está correcta, simplemente afirma "La oración está correcta".`;

        const correction = await callOpenAI(message, correctionPrompt);
        const explanation = await callOpenAI(message, explanationPrompt);

        const combinedFeedback = `${correction}\n\n${explanation}`;

        return { feedback: combinedFeedback, id: messageId };
    }

    async function callOpenAI(message: string, instruction: string): Promise<string> {
        const API_URL = 'https://api.openai.com/v1/chat/completions';
        const API_KEY = "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";

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

            <div className={`${styles.inputArea} flex items-center`}>
                <input
                    className="rounded-full py-2 pr-6 pl-10 flex-grow border border-gray-200 bg-gray-200 focus:bg-white focus:outline-none text-gray-600 focus:shadow-md transition duration-300 ease-in"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                />
                <button className="bg-custom-color hover:bg-custom-color text-white rounded px-4 py-2 ml-2" onClick={handleSend}>
                    Send
                </button>
            </div>

        </div>
    );
};

export default Chatbot;
