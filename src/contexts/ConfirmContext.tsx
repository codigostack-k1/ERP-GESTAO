import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, HelpCircle, ShieldAlert, Key } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}

export interface PromptOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  isPassword?: boolean;
}

interface ConfirmContextType {
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string, options?: PromptOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

interface ConfirmState {
  isOpen: boolean;
  message: string;
  title: string;
  confirmText: string;
  cancelText: string;
  type: 'info' | 'warning' | 'danger';
  resolve: (value: boolean) => void;
}

interface PromptState {
  isOpen: boolean;
  message: string;
  title: string;
  defaultValue: string;
  confirmText: string;
  cancelText: string;
  placeholder: string;
  isPassword?: boolean;
  resolve: (value: string | null) => void;
}

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [promptState, setPromptState] = useState<PromptState | null>(null);
  
  const promptInputRef = useRef<HTMLInputElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const [promptInputValue, setPromptInputValue] = useState('');

  const confirm = (message: string, options?: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        message,
        title: options?.title || 'Confirmação',
        confirmText: options?.confirmText || 'Confirmar',
        cancelText: options?.cancelText || 'Cancelar',
        type: options?.type || 'warning',
        resolve,
      });
    });
  };

  const prompt = (
    message: string, 
    defaultValue: string = '', 
    options?: PromptOptions
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptInputValue(defaultValue);
      setPromptState({
        isOpen: true,
        message,
        title: options?.title || 'Entrada Necessária',
        defaultValue,
        confirmText: options?.confirmText || 'Confirmar',
        cancelText: options?.cancelText || 'Cancelar',
        placeholder: options?.placeholder || '',
        isPassword: options?.isPassword || false,
        resolve,
      });
    });
  };

  const handleConfirmDecision = useCallback((decision: boolean) => {
    if (confirmState) {
      confirmState.resolve(decision);
      setConfirmState(null);
    }
  }, [confirmState]);

  const handlePromptDecision = useCallback((submit: boolean) => {
    if (promptState) {
      if (submit) {
        promptState.resolve(promptInputValue);
      } else {
        promptState.resolve(null);
      }
      setPromptState(null);
      setPromptInputValue('');
    }
  }, [promptState, promptInputValue]);

  // Keyboard controls for confirm (Enter to confirm, Esc to cancel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (confirmState) {
        if (e.key === 'Escape') {
          handleConfirmDecision(false);
        } else if (e.key === 'Enter') {
          handleConfirmDecision(true);
        }
      } else if (promptState) {
        if (e.key === 'Escape') {
          handlePromptDecision(false);
        } else if (e.key === 'Enter') {
          handlePromptDecision(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmState, promptState, promptInputValue, handleConfirmDecision, handlePromptDecision]);

  // Focus trap assistance
  useEffect(() => {
    if (confirmState?.isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [confirmState]);

  useEffect(() => {
    if (promptState?.isOpen && promptInputRef.current) {
      promptInputRef.current.focus();
    }
  }, [promptState]);

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}

      {/* --- CONFIRMATION MODAL --- */}
      <AnimatePresence>
        {confirmState && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => handleConfirmDecision(false)}
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-md w-full border border-gray-150 dark:border-gray-700 overflow-hidden z-10"
            >
              <div className="flex gap-4 items-start">
                <div className={`p-3 rounded-xl shrink-0 ${
                  confirmState.type === 'danger' 
                    ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' 
                    : confirmState.type === 'warning' 
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' 
                      : 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
                }`}>
                  {confirmState.type === 'danger' && <ShieldAlert size={28} />}
                  {confirmState.type === 'warning' && <AlertTriangle size={28} />}
                  {confirmState.type === 'info' && <HelpCircle size={28} />}
                </div>

                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {confirmState.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {confirmState.message}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => handleConfirmDecision(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                >
                  {confirmState.cancelText}
                </button>
                <button
                  ref={confirmButtonRef}
                  type="button"
                  onClick={() => handleConfirmDecision(true)}
                  className={`px-5 py-2 rounded-xl text-sm font-bold text-white transition-all transform active:scale-95 shadow-md cursor-pointer ${
                    confirmState.type === 'danger' 
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' 
                      : confirmState.type === 'warning' 
                        ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20' 
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                  }`}
                >
                  {confirmState.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PROMPT MODAL --- */}
      <AnimatePresence>
        {promptState && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => handlePromptDecision(false)}
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-md w-full border border-gray-150 dark:border-gray-700 overflow-hidden z-10"
            >
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 rounded-xl shrink-0">
                  <Key size={28} />
                </div>

                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {promptState.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed">
                    {promptState.message}
                  </p>

                  <div className="pt-2">
                    <input
                      ref={promptInputRef}
                      type={promptState.isPassword ? 'password' : 'text'}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder={promptState.placeholder}
                      value={promptInputValue}
                      onChange={(e) => setPromptInputValue(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => handlePromptDecision(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                >
                  {promptState.cancelText}
                </button>
                <button
                  type="button"
                  onClick={() => handlePromptDecision(true)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all transform active:scale-95 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {promptState.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </ConfirmContext.Provider>
  );
};
