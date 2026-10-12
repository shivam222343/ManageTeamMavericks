import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import './MindSagaKeyModal.css';

/**
 * Retro Sci-Fi Space Key Challenge Modal for Mind Saga
 * Based on Uiverse.io by Pinparker
 */
const MindSagaKeyModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialEmail = '',
  defaultKey = '',
  subEventName = 'MIND SAGA',
  loading = false
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [key, setKey] = useState(defaultKey || '');

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setKey(defaultKey || '');
    }
  }, [isOpen, initialEmail, defaultKey]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(key.trim().toUpperCase(), email.trim());
    }
  };

  return (
    <AnimatePresence>
      <div className="mindsaga-modal-backdrop" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[425px] flex justify-center"
        >
          {/* From Uiverse.io by Pinparker */}
          <form className="mindsaga-space-form" onSubmit={handleSubmit}>
            {/* Top Right Close Button */}
            <button
              type="button"
              className="mindsaga-close-btn"
              onClick={onClose}
              title="Close"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {/* Header Titles */}
            <div className="form-title">
              <span>access key</span>
            </div>
            <div className="title-2">
              <span>{'MINDSAGA'}</span>
            </div>

            {/* Shooting Stars Background */}
            <section className="bg-stars">
              <span className="star"></span>
              <span className="star"></span>
              <span className="star"></span>
              <span className="star"></span>
            </section>

            {/* Email Input */}
            <div className="input-container">
              <input
                placeholder="Email"
                type="email"
                className="input-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password / Access Key Input */}
            <div className="input-container">
              <input
                placeholder="Access Key"
                type="text"
                className="input-pwd"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                autoFocus
                required
              />
            </div>

            {/* Submit Button */}
            <button className="submit" type="submit" disabled={loading}>
              <span className="sign-text">
                {loading ? 'Verifying...' : 'Sign in'}
              </span>
            </button>

            {/* Bottom Link */}
            <p className="signup-link">
              {defaultKey && defaultKey !== key ? (
                <>
                  Pass Key:{' '}
                  <button
                    type="button"
                    className="up"
                    onClick={() => setKey(defaultKey)}
                    title="Click to paste pass key"
                  >
                    {defaultKey}
                  </button>
                </>
              ) : (
                <>
                  No key?{' '}
                  <button type="button" className="up" onClick={onClose}>
                    Check pass
                  </button>
                </>
              )}
            </p>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MindSagaKeyModal;
