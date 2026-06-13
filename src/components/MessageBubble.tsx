import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Message } from "../types";

interface MessageBubbleProps {
    message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const isUser = message.role === "user";

    return (
        <div className="py-2 text-slate-300 font-mono text-[13px]">
            <div className="mb-1">
                {isUser ? (
                    <>
                        {/* User Prefix (Hacker Style) */}
                        <span className="text-yellow-400 font-bold"> istiyak@local_breach</span>
                        <span className="text-white">:</span>
                        <span className="text-emerald-400 font-bold">~/memory</span>
                        <span className="text-white"> ❯ </span>
                    </>
                ) : (
                    <>
                        {/* AI Prefix (Smart Agent Style) */}
                        <span className="text-purple-400 font-bold"> istiyak_ai@neural_core</span>
                        <span className="text-white">:</span>
                        <span className="text-cyan-400 font-bold">~/void_sector</span>
                        <span className="text-yellow-400 font-bold"> ⚡ </span>
                    </>
                )}
            </div>
            <div className="pl-0 sm:pl-4 prose prose-invert max-w-none break-words prose-p:leading-snug prose-pre:p-0 prose-p:text-slate-300 prose-headings:text-white prose-strong:text-emerald-300 prose-code:text-emerald-300 prose-a:text-blue-400 prose-ul:text-slate-300 prose-ol:text-slate-300 prose-li:text-slate-300">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
                        code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || "");
                            const language = match ? match[1] : "";
                            const codeString = String(children).replace(/\n$/, "");

                            if (!inline && match) {
                                return <CodeBlock language={language} code={codeString} />;
                            }
                            return (
                                <code className="bg-white/5 text-emerald-300 font-mono text-sm px-1 rounded" {...props}>
                                    `{children}`
                                </code>
                            );
                        },
                    }}
                >
                    {message.content}
                </ReactMarkdown>
            </div>
            <div className="mt-4" />
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
        <div className="relative my-4 overflow-hidden bg-[#1e1e1e] border border-white/10 rounded-md shadow-lg">
            <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] text-xs text-slate-400 select-none border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="ml-2 font-semibold">{language || "text"}</span>
                </div>
                <button onClick={handleCopy} className="hover:text-white transition-colors">
                    {copied ? "copied" : "copy"}
                </button>
            </div>
            <div className="p-3 overflow-x-auto text-[13px]">
                <SyntaxHighlighter
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    style={vscDarkPlus as any}
                    language={language}
                    PreTag="div"
                    customStyle={{ margin: 0, padding: 0, background: "transparent" }}
                >
                    {code}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};