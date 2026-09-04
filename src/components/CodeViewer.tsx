import React, { useState } from 'react';
import { Copy, Check, Terminal, FileCode, Download } from 'lucide-react';
import { PYTHON_CODE_FILES } from '../data/codeFiles';

export const CodeViewer: React.FC = () => {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeFile = PYTHON_CODE_FILES[activeFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="python-code-viewer" className="bg-[#0a0a0f] rounded-xl border border-white/10 overflow-hidden shadow-2xl relative">
      {/* Top ambient glow line */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>

      {/* File navigation bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-[#050507]/90 px-4 py-2.5 gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {PYTHON_CODE_FILES.map((file, idx) => {
            const isActive = idx === activeFileIndex;
            return (
              <button
                key={file.name}
                id={`tab-${file.name.replace('.', '-')}`}
                onClick={() => setActiveFileIndex(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{file.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            id="download-active-code-btn"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-colors cursor-pointer"
            title="Download file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
          <button
            id="copy-active-code-btn"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* File summary banner */}
      <div className="bg-[#0a0a0f] px-4 py-2 border-b border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span>{activeFile.description}</span>
        <span className="text-indigo-400/80">Language: {activeFile.language}</span>
      </div>

      {/* Code contents block */}
      <div className="p-4 max-h-[580px] overflow-y-auto font-mono text-xs leading-relaxed text-slate-200 bg-[#050507] selection:bg-indigo-900/80">
        <pre id="code-content-pre" className="whitespace-pre overflow-x-auto">
          <code>{activeFile.content}</code>
        </pre>
      </div>
    </div>
  );
};
