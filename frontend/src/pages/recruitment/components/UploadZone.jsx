import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, Trash2, RefreshCcw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const UploadZone = ({
  fieldKey,
  fileList,
  register,
  setValue,
  error,
  isRequired,
  label,
  allowedTypes = [],
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const file = fileList && fileList[0];

  // Trigger progress simulation when a new file is detected
  useEffect(() => {
    if (file) {
      setIsUploading(true);
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            return 100;
          }
          return prev + 12;
        });
      }, 50);
      return () => clearInterval(interval);
    } else {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [file]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setValue(fieldKey, e.dataTransfer.files);
    }
  };

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setValue(fieldKey, null);
  };

  // Format file size nicely
  const formatSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isImage = file && file.type?.startsWith('image/');

  return (
    <div className="space-y-3 w-full">
      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-650 dark:text-zinc-405">
        {label} {isRequired && <span className="text-red-500">*</span>}
      </label>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className="w-full relative"
      >
        <input
          type="file"
          id={`input_${fieldKey}`}
          accept={allowedTypes.join(', ') || '*/*'}
          {...register}
          className="sr-only"
        />

        <AnimatePresence mode="wait">
          {!file ? (
            <motion.label
              key="dropzone"
              htmlFor={`input_${fieldKey}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-8 cursor-pointer transition-all duration-305 select-none group min-h-[200px]
                ${dragActive
                  ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                  : error
                  ? 'border-red-500/50 bg-red-500/5 dark:bg-red-950/5'
                  : 'bg-white/40 border-zinc-200 text-zinc-800 dark:bg-zinc-900/10 dark:border-zinc-800 dark:text-zinc-200 hover:border-blue-500/50 dark:hover:border-blue-500/30'
                }
              `}
            >
              {/* Animated Upload Icon */}
              <motion.div
                animate={dragActive ? { y: [-4, 4, -4] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="p-3 bg-zinc-50 border border-zinc-150 dark:bg-zinc-900 dark:border-zinc-800 text-zinc-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 rounded-2xl shadow-sm mb-4 transition-colors"
              >
                <UploadCloud size={22} />
              </motion.div>

              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 text-center">
                Drag &amp; drop your file here
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-550 font-medium mt-1 text-center">
                or <span className="text-blue-500 hover:underline font-bold">browse files</span> from your computer
              </span>
              <span className="text-[9px] text-zinc-450 dark:text-zinc-600 font-mono mt-3 uppercase tracking-widest">
                Supported: PDF, Images, Document (Max 5MB)
              </span>
            </motion.label>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-5 border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-zinc-900/20 backdrop-blur-md flex flex-col md:flex-row items-center gap-5 shadow-sm"
            >
              {/* Thumbnail / File Icon */}
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center shrink-0 shadow-sm relative group">
                {isImage ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Upload Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileText size={24} className="text-blue-500" />
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 space-y-2 w-full text-left">
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[160px] sm:max-w-xs md:max-w-md">
                      {file.name}
                    </p>
                    <span className="text-[9px] text-zinc-500 dark:text-zinc-405 font-bold uppercase tracking-widest font-mono">
                      {formatSize(file.size)}
                    </span>
                  </div>

                  {/* Success / Uploading Badge */}
                  {isUploading ? (
                    <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-650 dark:text-blue-400 rounded-full text-[9px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                      <RefreshCcw size={8} className="animate-spin" />
                      Uploading
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle size={10} />
                      Ready
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-850 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-bold font-mono text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">
                    <span>Progress</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto">
                <label
                  htmlFor={`input_${fieldKey}`}
                  className="flex-1 md:flex-none h-8 px-4 border rounded-xl border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 bg-white/40 dark:bg-zinc-900/30 text-zinc-700 dark:text-zinc-300 text-[9px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
                >
                  <RefreshCcw size={11} />
                  <span>Replace</span>
                </label>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="flex-1 md:flex-none h-8 px-4 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[9px] font-extrabold uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Trash2 size={11} />
                  <span>Remove</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <p className="text-[9px] text-red-500 font-bold px-2 flex items-center gap-1.5 animate-pulse">
          <AlertCircle size={11} />
          {error.message}
        </p>
      )}
    </div>
  );
};

export default UploadZone;
