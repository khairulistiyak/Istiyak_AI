import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Message } from "../types";
import { Bot, User, Clipboard, Check } from "lucide-react";
import clsx from "clsx";

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div className={clsx("flex gap-4 p-4", isUser ? "bg-slate-800/50" : "")}>
      <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-slate-700">
        {isUser ? <User size={18} className="text-slate-300" /> : <Bot size={18} className="text-indigo-400" />}
      </div>
      <div className="flex-1 overflow-hidden min-w-0">
        <div className="font-semibold mb-1 text-slate-300">{isUser ? "You" : "Istiyak AI "}</div>
        <div className="prose prose-invert max-w-none break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || "");
                const language = match ? match[1] : "";
                const codeString = String(children).replace(/\n$/, "");

                if (!inline && match) {
                  return <CodeBlock language={language} code={codeString} />;
                }
                return (
                  <code className="bg-slate-800 rounded px-1.5 py-0.5 text-slate-200" {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

const CodeBlock = ({ language, code }: { language: string; code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 rounded-md overflow-hidden bg-[#1E1E1E]">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-xs text-slate-400 select-none">
        <span className="uppercase">{language}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 hover:text-slate-200 transition-colors">
          {copied ? <Check size={14} className="text-green-400" /> : <Clipboard size={14} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus as any}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: 0, background: "transparent" }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};
