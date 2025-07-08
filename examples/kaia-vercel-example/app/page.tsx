'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  const [error, setError] = useState<string | null>(null);
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    maxSteps: 10,
    onError: (error) => {
      setError(error.message);
    }
  });
  
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {error && (
        <div className="text-red-500 mb-4 p-2 bg-red-50 dark:bg-red-900/20 rounded">
          {error}
        </div>
      )}
      {messages.map(m => (
        <div key={m.id} className="whitespace-pre-wrap">
          {m.role === 'user' ? 'User: ' : 'AI: '}
          {m.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={handleInputChange}
        />
      </form>
    </div>
  );
}