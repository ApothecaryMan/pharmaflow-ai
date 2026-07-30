import type React from 'react';

export const AppLoadingScreen: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className='h-screen w-screen flex items-center justify-center'>
      <div className='flex flex-col items-center gap-4'>
        <p
          className='py-2 text-lg tracking-tight text-zinc-500 dark:text-zinc-400 text-center'
        >
          {message}
        </p>
      </div>
    </div>
  );
};
