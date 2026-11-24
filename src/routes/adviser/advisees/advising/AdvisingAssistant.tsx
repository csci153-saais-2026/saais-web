import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ApiSchema } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatIcon, ChevronRightIcon, XIcon } from "@/components/icons";
import { askAdvisingAssistant } from "./advising-assistant.api";

type Message = ApiSchema<"AdvisingAIMessage">;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function AdvisingAssistant({
  studentId,
  isMockMode,
}: {
  studentId?: string;
  isMockMode: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [verificationNotice, setVerificationNotice] = useState("");
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);
  const chatLog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (chatLog.current)
      chatLog.current.scrollTop = chatLog.current.scrollHeight;
  }, [messages, pending, open]);
  const validStudent = !!studentId && UUID.test(studentId);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (
      !studentId ||
      !validStudent ||
      pending ||
      !text ||
      Array.from(text).length > 4000
    )
      return;
    setPending(true);
    setError("");
    try {
      const result = await askAdvisingAssistant(studentId, text, messages);
      if (!mounted.current) return;
      setVerificationNotice(result.verification_notice);
      setMessages((previous) => [
        ...previous,
        { role: "user", content: text },
        { role: "assistant", content: result.answer },
      ]);
      setMessage("");
    } catch {
      if (mounted.current)
        setError(
          "The assistant could not respond. Check your connection and access, then try again.",
        );
    } finally {
      if (mounted.current) setPending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
      <Button
        type="button"
        aria-label={
          open ? "Close advising assistant" : "Open advising assistant"
        }
        aria-expanded={open}
        aria-controls="advising-assistant-dialog"
        onClick={() => setOpen((value) => !value)}
        className="ml-auto flex size-[58px] rounded-full bg-[#2F4A12] p-0 text-[#FBF8EF] shadow-lg"
      >
        {open ? <XIcon className="size-6" /> : <ChatIcon className="size-6" />}
      </Button>
      {open && (
        <section
          id="advising-assistant-dialog"
          role="dialog"
          aria-label="Advising assistant"
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          className="absolute bottom-[72px] right-0 flex h-[min(500px,calc(100dvh-120px))] w-[min(372px,calc(100vw-32px))] flex-col overflow-hidden rounded-[6px] border border-[#E1DBC6] bg-white shadow-[0_24px_60px_rgba(22,32,12,0.28)]"
        >
          <header className="flex shrink-0 items-center gap-3 bg-[#1D2F0A] px-4 py-[14px] text-[#FBF8EF]">
            <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#E0A82E] text-[#3A2A05]">
              <ChatIcon className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-[1.25]">
                Advising assistant
              </p>
              <p className="text-[11.5px] text-[#F6F2E4]/60">
                {isMockMode ? "Demo preview" : "Adviser support"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
              className="flex size-[30px] shrink-0 items-center justify-center rounded-md text-[#F6F2E4]/70 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0A82E]"
            >
              <XIcon className="size-[17px]" />
            </button>
          </header>
          <div
            ref={chatLog}
            aria-live="polite"
            aria-relevant="additions"
            className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto bg-[#FBF8EF] p-4"
          >
            {!validStudent && (
              <p className="text-sm">
                Select a student record to use the assistant.
              </p>
            )}
            {messages.map((item, index) => (
              <div
                key={index}
                className={
                  item.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <p
                  className={
                    item.role === "user"
                      ? "max-w-[82%] whitespace-pre-wrap rounded-[12px_12px_3px_12px] bg-[#2F4A12] px-[13px] py-[9px] text-[13.5px] leading-[1.55] text-[#FBF8EF]"
                      : "max-w-[82%] whitespace-pre-wrap rounded-[12px_12px_12px_3px] bg-[#F2EDDC] px-[13px] py-[9px] text-[13.5px] leading-[1.55] text-[#16200C]"
                  }
                >
                  {item.content}
                </p>
              </div>
            ))}
            {pending && (
              <p role="status" className="text-sm text-[#6E6C58]">
                {isMockMode
                  ? "Preparing a simulated reply..."
                  : "Preparing a reply..."}
              </p>
            )}
          </div>
          <p className="shrink-0 px-4 pt-2 text-[11.5px] text-[#8C8A76]">
            {verificationNotice ||
              "AI can make mistakes. Verify the student record."}
          </p>
          {error && (
            <p role="alert" className="px-4 pt-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {Array.from(message.trim()).length > 4000 && (
            <p role="alert" className="px-4 pt-2 text-sm text-destructive">
              Messages must be 4,000 characters or fewer.
            </p>
          )}
          <form
            onSubmit={send}
            className="flex shrink-0 items-end gap-[10px] px-4 pb-[14px] pt-[10px]"
          >
            <Textarea
              id="advising-assistant-message"
              aria-label="Message the advising assistant"
              rows={1}
              placeholder="Ask about this advisee…"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              className="min-h-[38px] max-h-24 flex-1 resize-none rounded-[5px] border-[#E1DBC6] bg-white px-3 py-2 text-sm"
              disabled={!validStudent || pending}
            />
            <Button
              type="submit"
              aria-label="Send"
              className="size-[38px] shrink-0 rounded-full bg-[#2F4A12] p-0 text-[#FBF8EF]"
              disabled={
                !validStudent ||
                pending ||
                !message.trim() ||
                Array.from(message.trim()).length > 4000
              }
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
